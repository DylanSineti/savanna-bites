<?php

namespace App\Http\Controllers;

use App\Jobs\SendReviewRequest;
use App\Models\ConversationState;
use App\Models\Order;
use App\Models\OrderActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OrderController extends Controller
{
    private const DIV  = "──────────────────────";
    private const DIV2 = "━━━━━━━━━━━━━━━━━";

    // ─────────────────────────────────────────
    //  GET ALL ORDERS
    // ─────────────────────────────────────────
    public function index()
    {
        return response()->json(
            Order::with('assignedMember:id,name,role')->latest()->get()
        );
    }

    // ─────────────────────────────────────────
    //  POS QUEUE — active WhatsApp orders only
    // ─────────────────────────────────────────
    public function posQueue()
    {
        $orders = Order::with('assignedMember:id,name,role')
            ->whereNotIn('status', ['completed', 'pos'])
            ->where('phone', '!=', 'POS')
            ->where('created_at', '>=', now()->subDays(2))
            ->latest()
            ->get();

        return response()->json($orders);
    }

    // ─────────────────────────────────────────
    //  GET STATS
    // ─────────────────────────────────────────
    public function stats()
    {
        return response()->json([
            'total_orders'  => Order::count(),
            'pending'       => Order::where('status', 'pending')->count(),
            'pickup'        => Order::where('status', 'pickup')->count(),
            'delivery'      => Order::where('status', 'delivery')->count(),
            'completed'     => Order::where('status', 'completed')->count(),
            'total_revenue' => round(Order::sum('total'), 2),

            'today_orders'  => Order::whereDate('created_at', today())->count(),
            'today_revenue' => round(
                Order::whereDate('created_at', today())->sum('total'),
                2
            ),

            'today_cash' => round(
                Order::whereDate('created_at', today())
                    ->where('payment_method', 'cash')
                    ->where('payment_status', 'paid')
                    ->sum('amount_paid'),
                2
            ),

            'today_ecocash' => round(
                Order::whereDate('created_at', today())
                    ->where('payment_method', 'ecocash')
                    ->where('payment_status', 'paid')
                    ->sum('total'),
                2
            ),

            'cash_pending' => Order::where('payment_method', 'cash')
                ->where('payment_status', 'pending')
                ->whereNotIn('status', ['completed'])
                ->count(),
        ]);
    }

    // ─────────────────────────────────────────
    //  CREATE ORDER
    // ─────────────────────────────────────────
    public function store(Request $request)
    {
        $order = Order::create([
            'phone'      => $request->phone ?? 'POS',
            'order_text' => $request->order_text ?? '',
            'total'      => $request->total ?? 0,
            'status'     => $request->status ?? 'pos',
        ]);

        return response()->json($order, 201);
    }

    // ─────────────────────────────────────────
    //  UPDATE ORDER STATUS + NOTIFY CUSTOMER
    // ─────────────────────────────────────────
    public function update(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        $oldStatus        = $order->status;
        $oldPaymentStatus = $order->payment_status;
        $oldAssignedTo    = $order->assigned_to;

        $newStatus        = $request->input('status');
        $newPaymentStatus = $request->input('payment_status');

        $updates = [];

        if ($request->has('status')) {
            $updates['status'] = $newStatus;
        }

        if ($request->has('amount_paid')) {
            $newAmountPaid          = max(0, (float) $request->amount_paid);
            $updates['amount_paid'] = $newAmountPaid;

            if ((float) $newAmountPaid !== (float) $order->amount_paid) {
                OrderActivity::create([
                    'order_id'   => $order->id,
                    'field'      => 'amount_paid',
                    'old_value'  => number_format((float) $order->amount_paid, 2, '.', ''),
                    'new_value'  => number_format((float) $newAmountPaid, 2, '.', ''),
                    'changed_by' => 'admin',
                ]);
            }
        }

        if ($request->has('assigned_to')) {
            $updates['assigned_to'] = $request->assigned_to ?: null;
        }

        if ($request->has('payment_status')) {
            $updates['payment_status'] = $newPaymentStatus;

            if ($newPaymentStatus === 'paid' && $oldPaymentStatus !== 'paid') {
                $updates['payment_confirmed_at'] = now();
            }
        }

        $order->update($updates);
        $order->refresh()->loadMissing('assignedMember:id,name,role');

        // ── Activity log ──────────────────────────
        if ($request->has('status') && $oldStatus !== $newStatus) {
            OrderActivity::create([
                'order_id'   => $order->id,
                'field'      => 'status',
                'old_value'  => $oldStatus,
                'new_value'  => $newStatus,
                'changed_by' => 'admin',
            ]);
        }

        if ($request->has('payment_status') && $oldPaymentStatus !== $newPaymentStatus) {
            OrderActivity::create([
                'order_id'   => $order->id,
                'field'      => 'payment_status',
                'old_value'  => $oldPaymentStatus,
                'new_value'  => $newPaymentStatus,
                'changed_by' => 'admin',
            ]);
        }

        if ($request->has('assigned_to') && $oldAssignedTo != $request->assigned_to) {
            OrderActivity::create([
                'order_id'   => $order->id,
                'field'      => 'assigned_to',
                'old_value'  => $oldAssignedTo,
                'new_value'  => $request->assigned_to,
                'changed_by' => 'admin',
                'note'       => 'Delivery assigned',
            ]);
        }

        // ── POS orders — no notifications ──
        if ($order->phone === 'POS') {
            return response()->json($order->fresh()->load('assignedMember:id,name,role'));
        }

        $paymentStatusChanged = $request->has('payment_status') && $oldPaymentStatus !== $newPaymentStatus;
        $statusChanged        = $request->has('status')         && $oldStatus        !== $newStatus;

        // ── Cash: completed + paid in one action ──
        // Both status and payment_status are sent together from the frontend
        // "Delivered & Paid" / "Collected & Paid" button
        if (
            $statusChanged && $newStatus === 'completed' &&
            $paymentStatusChanged && $newPaymentStatus === 'paid' &&
            $order->payment_method === 'cash'
        ) {
            // Single completion message — no duplicate
            $this->notifyStatusChanged($order, 'completed');

            if (!$order->review_sent) {
                SendReviewRequest::dispatch($order->id)->delay(now()->addMinutes(2));
            }

            $convo = ConversationState::where('phone', $order->phone)->first();
            if ($convo) {
                $convo->update([
                    'state'      => 'completed',
                    'order_text' => (string) $order->id,
                ]);
            }

            return response()->json($order->fresh()->load('assignedMember:id,name,role'));
        }

        // ── EcoCash: payment confirmed (happens before preparation) ──
        if ($paymentStatusChanged && $newPaymentStatus === 'paid' && $order->payment_method === 'ecocash') {
            $this->notifyPaymentConfirmed($order);

            $convo = ConversationState::where('phone', $order->phone)->first();
            if ($convo) {
                $convo->update([
                    'state'      => 'completed',
                    'order_text' => (string) $order->id,
                ]);
            }
        }

        // ── Payment rejected ──
        if ($paymentStatusChanged && $newPaymentStatus === 'failed') {
            $this->notifyPaymentRejected($order);

            $convo = ConversationState::where('phone', $order->phone)->first();
            if ($convo) {
                $convo->update(['state' => 'idle', 'order_text' => null]);
            }
        }

        // ── Status changed — all other status transitions ──
        if ($statusChanged && !($paymentStatusChanged && $newPaymentStatus === 'paid')) {
            $this->notifyStatusChanged($order, $newStatus);

            if ($newStatus === 'completed' && !$order->review_sent) {
                SendReviewRequest::dispatch($order->id)->delay(now()->addMinutes(2));
            }
        }

        return response()->json($order->fresh()->load('assignedMember:id,name,role'));
    }
    // ─────────────────────────────────────────
    //  ORDER ACTIVITY LOG
    // ─────────────────────────────────────────
    public function activities($id)
    {
        Order::findOrFail($id);

        return response()->json(
            OrderActivity::where('order_id', $id)->orderByDesc('created_at')->get()
        );
    }

    // ─────────────────────────────────────────
    //  REVIEWS
    // ─────────────────────────────────────────
    public function reviews()
    {
        return response()->json(
            Order::whereNotNull('rating')
                ->orderByDesc('updated_at')
                ->get(['id', 'phone', 'order_text', 'total', 'rating', 'review', 'order_type', 'created_at', 'updated_at'])
        );
    }

    // ─────────────────────────────────────────
    //  PUBLIC INVOICE
    // ─────────────────────────────────────────
    public function invoice($id)
    {
        return response()->json(
            Order::findOrFail($id)
                ->only(['id', 'order_text', 'total', 'status', 'payment_status', 'created_at'])
        );
    }

    // ═════════════════════════════════════════
    //  NOTIFICATION METHODS
    // ═════════════════════════════════════════

    // ─────────────────────────────────────────
    //  1. PAYMENT CONFIRMED (cash or ecocash)
    // ─────────────────────────────────────────
    private function notifyPaymentConfirmed(Order $order): void
    {
        $orderNum = 'SB' . str_pad($order->id, 5, '0', STR_PAD_LEFT);
        $isPickup = $order->order_type === 'pickup';
        $etaLine  = $isPickup
            ? "📍 Pickup ready in *20–30 mins*"
            : "🚗 Delivery ETA *30–45 mins*";

        $message =
            "✅ *Payment Confirmed!*\n\n"
            . "🔖 Order *#{$orderNum}*\n"
            . self::DIV2 . "\n"
            . "💰 *\${$order->total}* — 📱 EcoCash ✅\n"
            . self::DIV2 . "\n\n"
            . "👨‍🍳 Our team is now preparing your order!\n\n"
            . "{$etaLine}\n\n"
            . "_We'll send you an update as soon as it's "
            . ($isPickup ? "ready for collection" : "on its way") . "._";

        $this->sendWhatsappMessage($order->phone, $message, 'Payment confirmed notify failed', $order->id);
    }

    // ─────────────────────────────────────────
    //  2. PAYMENT REJECTED
    // ─────────────────────────────────────────
    private function notifyPaymentRejected(Order $order): void
    {
        $orderNum  = 'SB' . str_pad($order->id, 5, '0', STR_PAD_LEFT);
        $isEcocash = $order->payment_method === 'ecocash';

        $message =
            "❌ *Payment Not Verified*\n\n"
            . "🔖 Order *#{$orderNum}*\n"
            . self::DIV2 . "\n"
            . ($isEcocash
                ? "We could not verify your EcoCash payment of *\${$order->total}*.\n\n"
                . "Please ensure the payment was sent correctly."
                : "We could not confirm your cash payment for this order.")
            . "\n\n"
            . "📞 Please contact us: *+263 77 247 6989*\n"
            . self::DIV2 . "\n\n"
            . "_Reply *hi* to start a new order._";

        $this->sendWhatsappMessage($order->phone, $message, 'Payment rejected notify failed', $order->id);
    }

    // ─────────────────────────────────────────
    //  3. ORDER STATUS CHANGED
    // ─────────────────────────────────────────
    private function notifyStatusChanged(Order $order, string $status): void
    {
        $orderNum = 'SB' . str_pad($order->id, 5, '0', STR_PAD_LEFT);
        $isPickup = $order->order_type === 'pickup';

        // out_for_delivery never fires for pickup
        if ($status === 'out_for_delivery' && $isPickup) return;

        // ready only fires for pickup
        if ($status === 'ready' && !$isPickup) return;

        $message = match ($status) {

            'preparing' =>
            "👨‍🍳 *Your order is being prepared!*\n\n"
                . "🔖 Order *#{$orderNum}*\n"
                . self::DIV2 . "\n"
                . "We've started cooking your food — won't be long!\n\n"
                . ($isPickup
                    ? "📍 Ready for pickup in *20–30 mins*."
                    : "🚗 We'll dispatch it to you shortly."),

            'ready' =>
            "✅ *Your order is ready for pickup!*\n\n"
                . "🔖 Order *#{$orderNum}*\n"
                . self::DIV2 . "\n"
                . "📍 Come collect whenever you're ready — we're waiting!\n\n"
                . "💵 *Please bring your cash payment of \${$order->total}.*",

            'out_for_delivery' =>
            "🛵 *Your order is on its way!*\n\n"
                . "🔖 Order *#{$orderNum}*\n"
                . self::DIV2 . "\n"
                . "🚗 Our driver is heading to you now. ETA *10–20 mins*.\n\n"
                . "💵 *Please have \${$order->total} cash ready at the door.*",

            'completed' =>
            "🙏 *Thank you for choosing Savanna Bites!*\n\n"
                . "🔖 Order *#{$orderNum}* — ✅ Complete\n"
                . self::DIV2 . "\n"
                . "We hope you loved your meal!\n\n"
                . "_Reply *hi* anytime to order again._ 🔥",

            default => null,
        };

        if (!$message) return;

        $this->sendWhatsappMessage($order->phone, $message, 'Status notify failed', $order->id);
    }

    // ─────────────────────────────────────────
    //  SHARED WHATSAPP SENDER
    // ─────────────────────────────────────────
    private function sendWhatsappMessage(string $to, string $message, string $logContext, int $orderId): void
    {
        $token   = config('services.whatsapp.token');
        $phoneId = config('services.whatsapp.phone_id');

        if (!$token || !$phoneId) {
            Log::warning('WhatsApp notify skipped: missing config', [
                'order_id' => $orderId,
                'to'       => $to,
            ]);
            return;
        }

        try {
            $response = Http::withToken($token)
                ->timeout(8)
                ->post("https://graph.facebook.com/v19.0/{$phoneId}/messages", [
                    'messaging_product' => 'whatsapp',
                    'to'                => $to,
                    'type'              => 'text',
                    'text'              => [
                        'body'        => $message,
                        'preview_url' => false,
                    ],
                ]);

            if (!$response->successful()) {
                Log::error($logContext, [
                    'order_id' => $orderId,
                    'to'       => $to,
                    'status'   => $response->status(),
                    'body'     => $response->body(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error($logContext, [
                'order_id' => $orderId,
                'to'       => $to,
                'error'    => $e->getMessage(),
            ]);
        }
    }
}
