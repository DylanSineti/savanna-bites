<?php

namespace App\Jobs;

use App\Models\Order;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendReviewRequest implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $orderId) {}

    public function handle(): void
    {
        $order = Order::find($this->orderId);

        // Skip if order gone, already reviewed, or not completed
        if (!$order || $order->review_sent || $order->phone === 'POS') {
            return;
        }

        /** @var Order $order */

        $phoneId = env('WHATSAPP_PHONE_ID');
        $token   = env('WHATSAPP_TOKEN');

        if (!$phoneId || !$token) return;

        $message = [
            'messaging_product' => 'whatsapp',
            'to'                => $order->phone,
            'type'              => 'interactive',
            'interactive'       => [
                'type'   => 'button',
                'body'   => [
                    'text' =>
                        "⭐ *How was your Savanna Bites experience?*\n\n" .
                        "We hope you loved your meal! Your feedback helps us serve you better.\n\n" .
                        "_Tap a star to rate your order #{$order->id}:_",
                ],
                'footer' => ['text' => 'Quick 1-tap review — takes 5 seconds!'],
                'action' => [
                    'buttons' => [
                        ['type' => 'reply', 'reply' => ['id' => "review_good_{$order->id}",    'title' => '⭐⭐⭐⭐⭐ Amazing']],
                        ['type' => 'reply', 'reply' => ['id' => "review_ok_{$order->id}",      'title' => '⭐⭐⭐ It was OK']],
                        ['type' => 'reply', 'reply' => ['id' => "review_bad_{$order->id}",     'title' => '⭐ Not Happy']],
                    ],
                ],
            ],
        ];

        try {
            $response = Http::withToken($token)->post(
                "https://graph.facebook.com/v19.0/{$phoneId}/messages",
                $message
            );

            if ($response->successful()) {
                $order->update(['review_sent' => true]);
            } else {
                Log::warning('Review request failed', ['order' => $order->id, 'response' => $response->body()]);
            }
        } catch (\Throwable $e) {
            Log::error('Review request exception', ['order' => $order->id, 'error' => $e->getMessage()]);
        }
    }
}
