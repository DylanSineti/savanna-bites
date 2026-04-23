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
        $newStatus        = $request->input('status');
        $oldPaymentStatus = $order->payment_status;
        $newPaymentStatus = $request->input('payment_status');
        $oldAssignedTo    = $order->assigned_to;

        $updates = [];

        if ($request->has('status')) {
            $updates['status'] = $newStatus;
        }

        // Track partial / instalment payment
        if ($request->has('amount_paid')) {
            $newAmountPaid = max(0, (float) $request->amount_paid);
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

        // Assign a team member for delivery
        if ($request->has('assigned_to')) {
            $updates['assigned_to'] = $request->assigned_to ?: null;
        }

        // Payment approval / rejection from dashboard
        if ($request->has('payment_status')) {
            $updates['payment_status'] = $newPaymentStatus;
        }

        // Save first so notifications use fresh values
        $order->update($updates);
        $order->refresh()->loadMissing('assignedMember:id,name,role');

        // ── Log changes ──
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

        // ── Payment notifications + conversation updates ──
        if (
            $request->has('payment_status') &&
            $oldPaymentStatus !== $newPaymentStatus &&
            $order->phone !== 'POS'
        ) {
            $convo = ConversationState::where('phone', $order->phone)->first();

            if ($newPaymentStatus === 'paid') {
                if ($convo) {
                    $convo->update([
                        'state'      => 'completed',
                        'order_text' => (string) $order->id,
                    ]);
                }

                $this->notifyCustomerPayment($order, 'approved');
            }

            if ($newPaymentStatus === 'failed') {
                if ($convo) {
                    $convo->update([
                        'state'      => 'idle',
                        'order_text' => null,
                    ]);
                }

                $this->notifyCustomerPayment($order, 'rejected');
            }
        }

        // ── Status notifications ──
        if ($request->has('status') && $oldStatus !== $newStatus && $order->phone !== 'POS') {
            $this->notifyCustomer($order, $newStatus);

            if ($newStatus === 'completed' && !$order->review_sent) {
                SendReviewRequest::dispatch($order->id)->delay(now()->addMinutes(2));
            }
        }

        return response()->json(
            $order->fresh()->load('assignedMember:id,name,role')
        );
    }

    // ─────────────────────────────────────────
    //  ORDER ACTIVITY LOG
    // ─────────────────────────────────────────
    public function activities($id)
    {
        Order::findOrFail($id);

        $activities = OrderActivity::where('order_id', $id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($activities);
    }

    // ─────────────────────────────────────────
    //  REVIEWS
    // ─────────────────────────────────────────
    public function reviews()
    {
        $reviews = Order::whereNotNull('rating')
            ->orderByDesc('updated_at')
            ->get([
                'id',
                'phone',
                'order_text',
                'total',
                'rating',
                'review',
                'order_type',
                'created_at',
                'updated_at',
            ]);

        return response()->json($reviews);
    }

    // ─────────────────────────────────────────
    //  PUBLIC INVOICE — no auth required
    // ─────────────────────────────────────────
    public function invoice($id)
    {
        $order = Order::findOrFail($id);

        return response()->json(
            $order->only(['id', 'order_text', 'total', 'status', 'payment_status', 'created_at'])
        );
    }

    // ─────────────────────────────────────────
    //  PAYMENT APPROVED / REJECTED NOTIFICATION
    // ─────────────────────────────────────────
    private function notifyCustomerPayment(Order $order, string $action): void
    {
        $message = match ($action) {
            'approved' => $order->payment_method === 'cash'
                ? "✅ *Payment Confirmed!*\n\n"
                    . "We've received your cash payment for Order #{$order->id}.\n"
                    . "Our team is now preparing your order! 🍽️\n\n"
                    . "You'll receive an update when it's ready."
                : "✅ *Payment Confirmed!*\n\n"
                    . "We've received your EcoCash payment for Order #{$order->id}.\n"
                    . "Our team is now preparing your order! 🍽️\n\n"
                    . "You'll receive an update when it's ready.",

            'rejected' => $order->payment_method === 'cash'
                ? "❌ *Payment Not Verified*\n\n"
                    . "We could not confirm the cash payment for Order #{$order->id}.\n\n"
                    . "Please contact us for help."
                : "❌ *Payment Not Verified*\n\n"
                    . "We could not verify your EcoCash payment for Order #{$order->id}.\n\n"
                    . "Please ensure you sent *\${$order->total}* correctly, then contact us for help.",

            default => null,
        };

        if (!$message) {
            return;
        }

        $this->sendWhatsappMessage($order->phone, $message, 'Payment notify failed', $order->id);
    }

    // ─────────────────────────────────────────
    //  WHATSAPP STATUS NOTIFICATION
    // ─────────────────────────────────────────
    private function notifyCustomer(Order $order, string $status): void
    {
        $isPickup = $order->order_type === 'pickup';

        if ($status === 'out_for_delivery' && $isPickup) {
            return;
        }

        $message = match ($status) {
            'preparing' => "*Your order is being prepared!*\n\nWe've started cooking your food. Won't be long now!",

            'ready' => $isPickup
                ? "*Your order is ready for collection!* 🏃\n\nCome grab your food whenever you're ready. We're waiting for you!"
                : "*Your order is ready and being dispatched!* 🚗\n\nYour delivery is on its way. ETA 10–20 mins.",

            'out_for_delivery' => "*Your order is on its way!*\n\nYour delivery is heading to you now. ETA 10–20 mins.",

            'completed' => "*Order completed!*\n\nThank you for choosing *" . env('RESTAURANT_NAME', 'My Restaurant') . "!*\n\nEnjoy your meal! Reply *hi* to order again.",

            default => null,
        };

        if (!$message) {
            return;
        }

        $this->sendWhatsappMessage($order->phone, $message, 'WhatsApp notify failed', $order->id);
    }

    // ─────────────────────────────────────────
    //  SHARED WHATSAPP SENDER
    // ─────────────────────────────────────────
    private function sendWhatsappMessage(string $to, string $message, string $logContext, int $orderId): void
    {
        $token   = config('services.whatsapp.token');
        $phoneId = config('services.whatsapp.phone_id');

        if (!$token || !$phoneId) {
            Log::warning('WhatsApp notify skipped: missing config credentials', [
                'order_id' => $orderId,
                'to'       => $to,
            ]);
            return;
        }

        try {
            $response = Http::withToken($token)
                ->timeout(8)
                ->post(
                    "https://graph.facebook.com/v19.0/{$phoneId}/messages",
                    [
                        'messaging_product' => 'whatsapp',
                        'to'                => $to,
                        'type'              => 'text',
                        'text'              => [
                            'body'        => $message,
                            'preview_url' => false,
                        ],
                    ]
                );

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