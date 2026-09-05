<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\AttendanceSetting;
use Illuminate\Support\Carbon;

class AttendanceRules
{
    public function businessDate(Carbon $at, ?AttendanceSetting $settings): string
    {
        if (! $settings || $settings->office_start_time <= $settings->office_end_time) {
            return $at->toDateString();
        }

        // A punch in the after-midnight portion belongs to the shift that began yesterday.
        return $at->format('H:i:s') < $settings->office_end_time
            ? $at->copy()->subDay()->toDateString()
            : $at->toDateString();
    }

    public function checkInValues(Carbon $at, string $businessDate, ?AttendanceSetting $settings): array
    {
        $lateMinutes = 0;
        if ($settings) {
            $deadline = Carbon::parse($businessDate.' '.$settings->office_start_time, $at->getTimezone())
                ->addMinutes($settings->grace_period_minutes);
            if ($at->greaterThan($deadline)) {
                $lateMinutes = $deadline->diffInMinutes($at);
            }
        }

        return ['late_minutes' => $lateMinutes, 'status' => $lateMinutes ? 'late' : 'present'];
    }

    public function checkOutValues(Attendance $attendance, Carbon $at, ?AttendanceSetting $settings): array
    {
        $workingMinutes = max(0, $attendance->check_in->diffInMinutes($at));
        $minimum = $settings?->minimum_working_minutes ?? 480;
        $overtime = $settings?->overtime_enabled ? max(0, $workingMinutes - $minimum) : 0;
        $earlyDeparture = 0;

        if ($settings) {
            $scheduledEnd = Carbon::parse($attendance->attendance_date->toDateString().' '.$settings->office_end_time, $at->getTimezone());
            if ($settings->office_start_time > $settings->office_end_time) {
                $scheduledEnd->addDay();
            }
            if ($at->lessThan($scheduledEnd)) {
                $earlyDeparture = $at->diffInMinutes($scheduledEnd);
            }
        }

        // A completed record is a full day only after the configured minimum.
        // Work beyond the half-day threshold but below that minimum remains explicitly partial.
        $halfDay = $settings?->half_day_after_minutes ?? 240;
        $status = $workingMinutes <= $halfDay
            ? 'half_day'
            : ($workingMinutes < $minimum ? 'partial' : ($attendance->late_minutes > 0 ? 'late' : 'present'));

        return [
            'working_minutes' => $workingMinutes,
            'overtime_minutes' => $overtime,
            'early_departure_minutes' => $earlyDeparture,
            'status' => $status,
        ];
    }
}
