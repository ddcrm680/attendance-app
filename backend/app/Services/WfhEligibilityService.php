<?php
namespace App\Services;
use App\Models\Employee; use App\Models\WfhRequest; use Illuminate\Support\Carbon; use Illuminate\Validation\ValidationException;
class WfhEligibilityService {
 public function assertAllowed(Employee $employee, Carbon $date): void { $settings=(new AttendanceSettingsResolver)->forOffice($employee->office); if(!$employee->wfh_eligible||!$settings?->wfh_enabled)throw ValidationException::withMessages(['mode'=>['Work from home is not available for your account.']]); if($settings->wfh_approval_required&&!WfhRequest::where('employee_id',$employee->id)->whereDate('attendance_date',$date->toDateString())->where('status','approved')->exists())throw ValidationException::withMessages(['mode'=>['An approved work-from-home request is required.']]); }
}
