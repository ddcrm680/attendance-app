<?php

namespace App\Services;

use App\Models\Office;

class GeofenceService
{
    /**
     * Great-circle distance between two coordinates, in meters.
     */
    public function distanceMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000;

        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Server-side geofence check. Never trust a frontend-only "inside/outside" flag —
     * this is the authoritative validation referenced in the spec (section 6).
     */
    public function isWithinOffice(Office $office, float $lat, float $lng): array
    {
        $distance = $this->distanceMeters(
            (float) $office->latitude,
            (float) $office->longitude,
            $lat,
            $lng
        );

        return [
            "inside" => $distance <= $office->radius,
            "distance_meters" => round($distance, 2),
        ];
    }

    /**
     * Find the nearest active office to a coordinate pair, for employees not
     * pinned to a single office.
     */
    public function nearestOffice(float $lat, float $lng): ?array
    {
        $nearest = null;
        $nearestDistance = null;

        foreach (Office::where("status", "active")->get() as $office) {
            $distance = $this->distanceMeters((float) $office->latitude, (float) $office->longitude, $lat, $lng);

            if ($nearestDistance === null || $distance < $nearestDistance) {
                $nearestDistance = $distance;
                $nearest = $office;
            }
        }

        if (! $nearest) {
            return null;
        }

        return ["office" => $nearest, "distance_meters" => round($nearestDistance, 2)];
    }
}
