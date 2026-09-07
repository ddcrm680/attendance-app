<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\WfhRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class WfhEligibilityService
{
    public function __construct(private AttendanceSettingsResolver $settings) {}

    public function assertAllowed(Employee $employee, Carbon $date): WfhPolicy
    {
        $policy = $this->settings->wfhFor($employee);

        if (! $employee->wfh_eligible || ! $policy->enabled) {
            throw ValidationException::withMessages([
                'mode' => ['Work from home is not available for your account.'],
            ]);
        }

        if (! $policy->approvalRequired) {
            return $policy;
        }

        $hasApproval = WfhRequest::where('employee_id', $employee->id)
            ->whereDate('attendance_date', $date->toDateString())
            ->where('status', 'approved')
            ->exists();

        if (! $hasApproval) {
            throw ValidationException::withMessages([
                'mode' => ['An approved work-from-home request is required.'],
            ]);
        }

        return $policy;
    }
}
