<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Order;
use App\Jobs\SendReviewRequest;
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
            Order::latest()->get()
        );
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
            'today_revenue' => round(Order::whereDate('created_at', today())->sum('total'), 2),
        ]);
    }

    public function store(Request $request)
    {
        $order = Order::create([
            'phone'      => $request->phone      ?? 'POS',
            'order_text' => $request->order_text ?? '',
            'total'      => $request->total      ?? 0,
            'status'     => $request->status     ?? 'pos',
        ]);

        return response()->json($order, 201);
    }

    // ─────────────────────────────────────────
    //  UPDATE ORDER STATUS + NOTIFY CUSTOMER
    // ─────────────────────────────────────────
    public function update(Request $request, $id)
    {
        $order = Order::findOrFail($id);
        $old   = $order->status;
        $new   = $request->status;

        $order->update(['status' => $new]);

        // Notify the customer on meaningful status changes (skip POS orders)
        if ($old !== $new && $order->phone !== 'POS') {
            $this->notifyCustomer($order, $new);

            // Schedule review request 2 mins after order is completed
            if ($new === 'completed' && !$order->review_sent) {
                SendReviewRequest::dispatch($order->id)->delay(now()->addMinutes(2));
            }
        }

        return response()->json($order);
    }

    // ─────────────────────────────────────────
    //  WHATSAPP NOTIFICATION
    // ─────────────────────────────────────────
    private function notifyCustomer(Order $order, string $status): void
    {
        $message = match ($status) {
            'preparing'        => "*Your order is being prepared!*\n\nWe've started cooking your food. Won't be long now!",
            'ready'            => "*Your order is ready for pickup!*\n\nCome grab your food whenever you're ready. We're waiting!",
            'out_for_delivery' => "*Your order is on its way!*\n\nYour delivery is heading to you now. ETA 10-20 mins.",
            'completed'        => "*Order completed!*\n\nThank you for choosing *Savanna Bites!*\n\nEnjoy your meal! Reply *hi* to order again.",
            default            => null,
        };

        if (!$message) return;

        $phoneId = env('WHATSAPP_PHONE_ID');
        $token   = env('WHATSAPP_TOKEN');

        if (!$phoneId || !$token) return;

        try {
            Http::withToken($token)->post(
                "https://graph.facebook.com/v19.0/{$phoneId}/messages",
                [
                    'messaging_product' => 'whatsapp',
                    'to'                => $order->phone,
                    'type'              => 'text',
                    'text'              => ['body' => $message, 'preview_url' => false],
                ]
            );
        } catch (\Throwable $e) {
            Log::error('WhatsApp notify failed', ['order' => $order->id, 'error' => $e->getMessage()]);
        }
    }
}
