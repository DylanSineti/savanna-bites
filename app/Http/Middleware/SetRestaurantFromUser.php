<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\Restaurant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;

/**
 * Binds the current restaurant into the container from the authenticated user.
 * Applied to all dashboard API routes that require auth.
 */
class SetRestaurantFromUser
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Not authenticated.'], 403);
        }

        // Single-restaurant mode: prefer restaurant on user if present,
        // otherwise fall back to the first active restaurant.
        $restaurant = $user->restaurant ?? Restaurant::where('is_active', true)->first();

        if (!$restaurant || !$restaurant->is_active) {
            return response()->json(['error' => 'Restaurant is inactive.'], 403);
        }

        App::instance('restaurant', $restaurant);

        return $next($request);
    }
}
