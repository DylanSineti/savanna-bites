<?php

namespace App\Jobs;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendReviewRequest implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public readonly int $orderId) {}

    public function handle(): void
    {
        /** @var Order|null $order */
        $order = Order::with('restaurant')->find($this->orderId);

        if (!$order || $order->review_sent || !$order->restaurant) {
            return;
        }

        $restaurant = $order->restaurant;
        $phoneId    = $restaurant->whatsapp_phone_id;
        $token      = $restaurant->whatsapp_token;

        if (!$phoneId || !$token) {
            Log::warning("SendReviewRequest: missing WhatsApp credentials for restaurant #{$restaurant->id}");
            return;
        }

        $payload = [
            'messaging_product' => 'whatsapp',
            'to'                => $order->phone,
            'type'              => 'interactive',
            'interactive'       => [
                'type' => 'button',
                'body' => [
                    'text' =>
                        "⭐ *How was your order?*\n\n" .
                        "Hi! We hope you enjoyed your {$restaurant->name} order #{$order->id}. " .
                        "Your feedback helps us serve you better. 🙏",
                ],
                'action' => [
                    'buttons' => [
                        ['type' => 'reply', 'reply' => ['id' => "review_good_{$order->id}", 'title' => '😍 Loved it!']],
                        ['type' => 'reply', 'reply' => ['id' => "review_ok_{$order->id}",   'title' => '😐 It was okay']],
                        ['type' => 'reply', 'reply' => ['id' => "review_bad_{$order->id}",  'title' => '😞 Not great']],
                    ],
                ],
            ],
        ];

        $response = Http::withToken($token)
            ->post("https://graph.facebook.com/v19.0/{$phoneId}/messages", $payload);

        if ($response->successful()) {
            $order->update(['review_sent' => true]);
        } else {
            Log::error("SendReviewRequest: failed to send to {$order->phone}", [
                'status'   => $response->status(),
                'response' => $response->body(),
            ]);
        }
    }
}
