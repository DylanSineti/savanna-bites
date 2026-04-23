<?php

namespace App\Http\Controllers;

use App\Models\ConversationState;
use App\Models\Order;
use App\Services\PaynowService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    /**
     * Paynow POSTs to this URL when a payment status changes.
     * Fields: reference, paynowreference, amount, status, hash
     */
    public function result(Request $request)
    {
        $data = $request->all();

        Log::info('Paynow result received', $data);

        $paynow = app(PaynowService::class);

        if (!$paynow->verifyResultHash($data)) {
            Log::warning('Paynow result: hash verification failed');
            return response('Hash mismatch', 400);
        }

        $status    = strtolower($data['status'] ?? '');
        $reference = $data['reference'] ?? '';
        $ppRef     = $data['paynowreference'] ?? $reference;

        // Extract order ID from our merchant reference "Order #123"
        if (preg_match('/#?(\d+)/', $reference, $match)) {
            $orderId = (int) $match[1];
        } else {
            $orderId = 0;
        }

        /** @var Order|null $order */
        $order = $orderId ? Order::with('restaurant')->find($orderId) : null;

        if (!$order || !$order->restaurant) {
            Log::warning('Paynow result: order not found', ['reference' => $reference]);
            return response('OK');
        }

        $restaurant = $order->restaurant;

        // Bind the restaurant for PaynowService hash verification to use correct key
        app()->instance('restaurant', $restaurant);

        if ($order->payment_status === 'paid') {
            return response('OK');
        }

        if ($status === 'paid') {
            $order->update([
                'payment_status'    => 'paid',
                'payment_reference' => $ppRef,
            ]);

            $this->sendWhatsApp(
                $order->phone,
                "✅ *Payment Confirmed!*\n\n" .
                "We've received your EcoCash payment for Order #{$order->id}.\n" .
                "Our team is now preparing your order! 🍽️\n\n" .
                "You'll receive an update when it's ready.",
                $restaurant
            );

            $adminPhone = $restaurant->admin_whatsapp;
            if ($adminPhone) {
                $type = $order->status === 'delivery' ? '🚗 Delivery' : '🏃 Pickup';
                $this->sendWhatsApp(
                    $adminPhone,
                    "💰 *EcoCash Payment Received!*\n" .
                    "━━━━━━━━━━━━━━━━━━━━\n\n" .
                    "🆔 Order: #{$order->id}\n" .
                    "📱 Customer: +{$order->phone}\n" .
                    "🕐 Time: " . now()->format('H:i') . "\n\n" .
                    "🛒 *Items:*\n" . $order->order_text . "\n\n" .
                    "━━━━━━━━━━━━━━━━━━━━\n" .
                    "💵 *Total: \${$order->total}*\n" .
                    "{$type}\n" .
                    "🔖 Ref: {$ppRef}\n" .
                    "━━━━━━━━━━━━━━━━━━━━",
                    $restaurant
                );
            }

            $convo = ConversationState::where('phone', $order->phone)->first();
            if ($convo) {
                $convo->update(['state' => 'completed', 'order_text' => (string) $order->id]);
            }

        } elseif (in_array($status, ['cancelled', 'failed', 'disputed'])) {

            $order->update(['payment_status' => 'failed']);

            $convo = ConversationState::where('phone', $order->phone)->first();

            // ─────────────────────────────────────────────────────────────────
            // FIX: Only intervene if pollAndFinalise() has NOT already restored
            // the cart. If state is already 'payment_choice', the poll loop
            // handled it — don't overwrite it (that's what caused the welcome
            // screen to appear instead of the retry options).
            // ─────────────────────────────────────────────────────────────────
            if ($convo && $convo->state !== 'payment_choice') {

                // Rebuild the cart from the saved order_text so the user can retry
                $cart     = $this->rebuildCartFromOrder($order);
                $isPickup = $order->status === 'pickup';

                $convo->update([
                    'state'      => 'payment_choice',
                    'cart'       => json_encode($cart),
                    'order_text' => $isPickup ? 'pickup' : 'delivery',
                ]);

                // Only send the failure message if pollAndFinalise() didn't
                // already send one (it only sends when it times out, not on
                // an immediate cancellation from Paynow's webhook).
                $this->sendWhatsApp(
                    $order->phone,
                    "❌ *EcoCash Payment Failed*\n\n" .
                    "We couldn't process your payment for Order #" .
                    str_pad($order->id, 5, '0', STR_PAD_LEFT) . ".\n\n" .
                    "Your cart has been restored — please reply *hi* to retry,\n" .
                    "or contact us: 📞 " .
                    ($restaurant->contact_phone ?? $restaurant->admin_whatsapp ?? ''),
                    $restaurant
                );
            }
            // If state IS already 'payment_choice', pollAndFinalise() already
            // sent a timeout message and restored the cart — do nothing here.
        }

        // Status 'created' or 'sent' = still pending; do nothing

        return response('OK');
    }

    /**
     * Paynow redirects the browser here after the payment page.
     */
    public function return(Request $request)
    {
        return redirect('/')->with('message', 'Payment processing. You will receive a WhatsApp update shortly.');
    }

    // ══════════════════════════════════════════
    //  HELPERS
    // ══════════════════════════════════════════

    /**
     * Rebuild a cart array from the order_text stored on the Order model.
     * order_text is stored as "qty1 keyword1 qty2 keyword2 ..."
     * e.g. "2 burger 1 chips"
     */
    private function rebuildCartFromOrder(Order $order): array
    {
        $cart  = [];
        $parts = preg_split('/\s+/', trim($order->order_text ?? ''));

        for ($i = 0; $i + 1 < count($parts); $i += 2) {
            $qty = (int) $parts[$i];
            $kw  = $parts[$i + 1];
            if ($qty > 0 && $kw) {
                $cart[$kw] = $qty;
            }
        }

        return $cart;
    }

    private function sendWhatsApp(string $phone, string $message, \App\Models\Restaurant $restaurant): void
    {
        $phoneId = $restaurant->whatsapp_phone_id;
        $token   = $restaurant->whatsapp_token;

        if (!$phoneId || !$token) return;

        Http::withToken($token)->post(
            "https://graph.facebook.com/v19.0/{$phoneId}/messages",
            [
                'messaging_product' => 'whatsapp',
                'to'                => $phone,
                'type'              => 'text',
                'text'              => ['body' => $message],
            ]
        );
    }
}