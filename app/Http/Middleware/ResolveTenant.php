<?php

namespace App\Http\Middleware;

use App\Models\Restaurant;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;

/**
 * Resolves the current tenant (Restaurant) from the incoming WhatsApp webhook.
 *
 * Meta sends the WhatsApp Phone Number ID in the payload under:
 *   entry[0].changes[0].value.metadata.phone_number_id
 *
 * We look up the Restaurant row that owns that phone_number_id and bind it
 * into the container so every other class can retrieve it via:
 *   app('restaurant')
 */
class ResolveTenant
{
    public function handle(Request $request, Closure $next)
    {
        // ── GET /webhook — verification handshake ──────────────────────────────
        // Meta sends the verify_token so we can identify the restaurant.
        if ($request->isMethod('GET')) {
            $verifyToken = $request->query('hub_verify_token');
            $restaurant  = Restaurant::where('verify_token', $verifyToken)
                ->where('is_active', true)
                ->first();

            // Allow a global env-based verify token as a fallback. If the env token is used,
            // bind the first active restaurant so downstream code still has a restaurant.
            if (!$restaurant) {
                if ($verifyToken === env('WHATSAPP_VERIFY_TOKEN')) {
                    // If no DB restaurant matches, bind a temporary Restaurant instance
                    // constructed from env vars so webhook verification can succeed in dev.
                    $restaurant = Restaurant::where('is_active', true)->first();
                    if (!$restaurant) {
                        $restaurant = new Restaurant();
                        $restaurant->name = env('RESTAURANT_NAME', 'Demo Restaurant');
                        $restaurant->whatsapp_phone_id = env('WHATSAPP_PHONE_ID');
                        $restaurant->verify_token = env('WHATSAPP_VERIFY_TOKEN');
                        $restaurant->is_active = true;
                    }
                } else {
                    return response('Forbidden', 403);
                }
            }

            App::instance('restaurant', $restaurant);
            return $next($request);
        }

        // ── POST /webhook — incoming message ───────────────────────────────────
        // Meta includes the receiving phone number ID in the payload.
        $phoneNumberId = $request->input('entry.0.changes.0.value.metadata.phone_number_id');

        if (!$phoneNumberId) {
            return response()->json(['status' => 'ignored']);
        }

        $restaurant = Restaurant::where('whatsapp_phone_id', $phoneNumberId)
            ->where('is_active', true)
            ->first();

        if (!$restaurant) {
            // Allow env-based phone id to bind a temporary restaurant in dev.
            if ($phoneNumberId && $phoneNumberId === env('WHATSAPP_PHONE_ID')) {
                $restaurant = new Restaurant();
                $restaurant->name = env('RESTAURANT_NAME', 'Demo Restaurant');
                $restaurant->whatsapp_phone_id = $phoneNumberId;
                $restaurant->verify_token = env('WHATSAPP_VERIFY_TOKEN');
                $restaurant->is_active = true;
            } else {
                return response()->json(['status' => 'unknown_restaurant']);
            }
        }

        App::instance('restaurant', $restaurant);
        return $next($request);
    }
}
