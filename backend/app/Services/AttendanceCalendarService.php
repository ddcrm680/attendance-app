<?php
namespace App\Services;
use App\Models\Employee; use App\Models\Holiday; use App\Models\LeaveRequest; use Illuminate\Support\Carbon; use Illuminate\Validation\ValidationException;
class AttendanceCalendarService {
 public function status(Employee $employee, Carbon $date): string { $settings=(new AttendanceSettingsResolver)->forOffice($employee->office); if(Holiday::where('holiday_date',$date->toDateString())->where('active',true)->exists())return 'holiday'; if(LeaveRequest::where('employee_id',$employee->id)->where('status','approved')->where('start_date','<=',$date->toDateString())->where('end_date','>=',$date->toDateString())->exists())return 'leave'; $days=$settings?->working_days ?? [1,2,3,4,5,6,7]; return in_array($date->dayOfWeekIso,$days,true)?'working_day':'week_off'; }
 public function assertAttendanceAllowed(Employee $employee, Carbon $date): void { $status=$this->status($employee,$date); if($status!=='working_day') throw ValidationException::withMessages(['attendance'=>["Attendance cannot be marked on {$status}."]]); }
}
