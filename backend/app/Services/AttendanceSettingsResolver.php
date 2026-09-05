<?php

namespace App\Services;

use App\Models\AttendanceSetting;
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
}
