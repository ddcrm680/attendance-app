<?php

namespace App\Services;

use App\Models\AttendanceSetting;
use App\Models\Employee;
use App\Models\Office;

class AttendanceSettingsResolver
{
    public function forOffice(?Office $office): ?AttendanceSetting
    {
        if ($office) {
            $setting = $office->attendanceSetting;
            if ($setting) {
                return $setting;
            }
        }

        return AttendanceSetting::whereNull('office_id')->first();
    }

    public function wfhFor(Employee $employee): WfhPolicy
    {
        $settings = $this->forOffice($employee->office);

        return new WfhPolicy(
            enabled: $employee->wfh_enabled_override ?? (bool) $settings?->wfh_enabled,
            gpsRequired: (bool) $settings?->wfh_gps_required,
            photoRequired: (bool) $settings?->wfh_photo_required,
            approvalRequired: $employee->wfh_approval_required_override ?? (bool) $settings?->wfh_approval_required,
            trackingEnabled: (bool) $settings?->wfh_tracking_enabled,
        );
    }

    public function wfhAvailableFor(Employee $employee): bool
    {
        return $employee->wfh_eligible && $this->wfhFor($employee)->enabled;
    }
}
