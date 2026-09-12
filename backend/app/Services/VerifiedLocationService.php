<?php

namespace App\Services;

use App\Models\Office;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class VerifiedLocationService
{
    public function __construct(
        private GeofenceService $geofence,
        private AttendanceSettingsResolver $settings,
    ) {}

    /**
     * Verify GPS quality and attach assigned-office distance as informational
     * attendance metadata. Office radius never controls whether a punch or live
     * location update is accepted.
     *
     * @return array{latitude: float, longitude: float, accuracy: float, distance_meters: float|null}
     */
    public function verify(Office $office, array $location): array
    {
        if ($office->status !== 'active' || ! $this->isValidOffice($office)) {
            throw ValidationException::withMessages([
                'office' => ['Your assigned office cannot be used for attendance. Contact HR.'],
            ]);
        }

        $verifiedLocation = $this->verifyGps($office, $location);
        $result = $this->geofence->isWithinOffice($office, $verifiedLocation['latitude'], $verifiedLocation['longitude']);
        return array_merge($verifiedLocation, ['distance_meters' => $result['distance_meters']]);
    }

    /** @return array{latitude: float, longitude: float, accuracy: float, distance_meters: null} */
    public function verifyGps(Office $office, array $location): array
    {
        $this->assertFreshPosition($location['position_timestamp'] ?? null);
        $settings = $this->settings->forOffice($office);
        $accuracy = (float) $location['accuracy'];
        if ($accuracy > ($settings?->gps_accuracy_threshold_meters ?? 100)) {
            throw ValidationException::withMessages([
                'accuracy' => ['GPS accuracy is too low. Move to an open area and try again.'],
            ]);
        }

        return [
            'latitude' => (float) $location['latitude'],
            'longitude' => (float) $location['longitude'],
            'accuracy' => $accuracy,
            'distance_meters' => null,
        ];
    }

    private function assertFreshPosition(?int $timestamp): void
    {
        if ($timestamp === null) {
            return;
        }
        $capturedAt = Carbon::createFromTimestampMs($timestamp, config('app.timezone'));
        if (
            $capturedAt->lessThan(now()->subSeconds(config('attendance.max_position_age_seconds')))
            || $capturedAt->greaterThan(now()->addMinute())
        ) {
            throw ValidationException::withMessages([
                'position_timestamp' => ['Your location is stale. Refresh your location and try again.'],
            ]);
        }
    }

    private function isValidOffice(Office $office): bool
    {
        return is_numeric($office->latitude) && (float) $office->latitude >= -90 && (float) $office->latitude <= 90
            && is_numeric($office->longitude) && (float) $office->longitude >= -180 && (float) $office->longitude <= 180;
    }
}
