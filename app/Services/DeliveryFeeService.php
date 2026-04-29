<?php

namespace App\Services;

class DeliveryFeeService
{
    // [max_km, fee, min_meals, zone_label]
    private const ZONES = [
        [0.4, 0.00, 1, 'free_zone'],
        [1.0, 0.50, 2, '1km'],
        [2.0, 1.00, 5, '2km'],
        [5.0, 1.50, 5, '3_5km'],
    ];

    private float $shopLat;
    private float $shopLng;

    public function __construct()
    {
        $this->shopLat = (float) config('services.savanna_bites.shop_lat');
        $this->shopLng = (float) config('services.savanna_bites.shop_lng');
    }

    public function calculate(float $lat, float $lng, int $mealCount): array
    {
        $distanceKm = $this->haversine($this->shopLat, $this->shopLng, $lat, $lng);

        if ($distanceKm > 5.0) {
            return [
                'eligible'    => false,
                'fee'         => null,
                'distance_km' => round($distanceKm, 2),
                'reason'      => 'out_of_range',
            ];
        }

        foreach (self::ZONES as [$maxKm, $fee, $minMeals, $zone]) {
            if ($distanceKm <= $maxKm) {
                if ($mealCount < $minMeals) {
                    return [
                        'eligible'    => false,
                        'fee'         => $fee,
                        'distance_km' => round($distanceKm, 2),
                        'zone'        => $zone,
                        'reason'      => 'min_meals',
                        'min_meals'   => $minMeals,
                        'meal_count'  => $mealCount,
                        'meals_short' => $minMeals - $mealCount,
                    ];
                }

                return [
                    'eligible'    => true,
                    'fee'         => $fee,
                    'distance_km' => round($distanceKm, 2),
                    'zone'        => $zone,
                ];
            }
        }

        // Unreachable — but satisfies static analysis
        return [
            'eligible'    => false,
            'fee'         => null,
            'distance_km' => round($distanceKm, 2),
            'reason'      => 'out_of_range',
        ];
    }

    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371;
        $dLat        = deg2rad($lat2 - $lat1);
        $dLng        = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $earthRadius * 2 * asin(sqrt($a));
    }
}
