<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Restaurant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BroadcastController extends Controller
{
    private function restaurant(): Restaurant
    {
        if (app()->bound('restaurant')) {
            return app('restaurant');
        }

        return Restaurant::where('is_active', true)->firstOrFail();
    }

    /**
     * Return a deduplicated list of customer phones with order counts,
     * sorted by most-recent order date — for the broadcast recipients UI.
     */
    public function recipients()
    {
        $rows = Order::selectRaw('phone, COUNT(*) as order_count, MAX(created_at) as last_order')
            ->whereNotNull('phone')
            ->where('phone', '!=', 'POS')
            ->groupBy('phone')
            ->orderByDesc('last_order')
            ->get();

        return response()->json($rows);
    }

    /**
     * Send a free-text WhatsApp message to the given list of phone numbers.
     */
    public function send(Request $request)
    {
        $request->validate([
            'phones'   => 'required|array|min:1|max:500',
            'phones.*' => 'required|string',
            'message'  => 'required|string|min:1|max:4000',
        ]);

        $restaurant = $this->restaurant();
        $phoneId    = $restaurant->whatsapp_phone_id;
        $token      = $restaurant->whatsapp_token;

        if (!$phoneId || !$token) {
            return response()->json(['error' => 'WhatsApp credentials not configured.'], 500);
        }

        $sent    = 0;
        $failed  = 0;
        $errors  = [];

        foreach ($request->phones as $phone) {
            try {
                $resp = Http::withToken($token)->post(
                    "https://graph.facebook.com/v19.0/{$phoneId}/messages",
                    [
                        'messaging_product' => 'whatsapp',
                        'to'                => $phone,
                        'type'              => 'text',
                        'text'              => ['body' => $request->message, 'preview_url' => false],
                    ]
                );

                if ($resp->successful()) {
                    $sent++;
                } else {
                    $failed++;
                    $body    = $resp->json();
                    $errMsg  = $body['error']['message'] ?? "HTTP {$resp->status()}";
                    $errors[] = ['phone' => $phone, 'reason' => $errMsg];
                    Log::error('WhatsApp API error', [
                        'to'     => $phone,
                        'status' => $resp->status(),
                        'body'   => $body,
                    ]);
                }
            } catch (\Throwable $e) {
                $failed++;
                $errors[] = ['phone' => $phone, 'reason' => $e->getMessage()];
                Log::error('Broadcast exception', ['phone' => $phone, 'error' => $e->getMessage()]);
            }
        }

        return response()->json(['sent' => $sent, 'failed' => $failed, 'errors' => $errors]);
    }
}
