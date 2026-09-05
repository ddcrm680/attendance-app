<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\LeaveRequest;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function stats()
    {
        $today = Carbon::today()->toDateString();
        $totalEmployees = Employee::where('status', 'active')->count();

        $onLeave = LeaveRequest::where('status','approved')->whereDate('start_date','<=',$today)->whereDate('end_date','>=',$today)->count();
        $attendance = Attendance::where('attendance_date', $today)->selectRaw("sum(case when status in ('present','late','half_day','partial','work_from_home') then 1 else 0 end) as present, sum(case when status = 'late' then 1 else 0 end) as late, sum(case when check_in is not null and check_out is null then 1 else 0 end) as currently_working, sum(case when check_out is not null then 1 else 0 end) as checked_out, avg(case when working_minutes > 0 then working_minutes end) as average_working_minutes")->first();
        $present = (int) ($attendance->present ?? 0);
        $late = (int) ($attendance->late ?? 0);
        $currentlyWorking = (int) ($attendance->currently_working ?? 0);
        $checkedOut = (int) ($attendance->checked_out ?? 0);
        $absent = max($totalEmployees - $present - $onLeave, 0);
        $avgWorkingMinutes = $attendance->average_working_minutes ?? 0;

        return response()->json([
            'date' => $today,
            'total_employees' => $totalEmployees,
            'present_today' => $present,
            'absent_today' => $absent,
            'late_today' => $late,
            'on_leave' => $onLeave,
            'currently_working' => $currentlyWorking,
            'checked_out' => $checkedOut,
            'average_working_minutes' => round($avgWorkingMinutes),
        ]);
    }

    public function liveEmployees()
    {
        // Correlated latest-log join avoids one query per active employee and never loads history.
        $working = Attendance::query()
            ->select('attendance.*', 'latest_location.latitude as live_latitude', 'latest_location.longitude as live_longitude', 'latest_location.accuracy as live_accuracy', 'latest_location.recorded_at as live_recorded_at')
            ->leftJoin('location_logs as latest_location', function ($join) {
                $join->on('latest_location.attendance_id', '=', 'attendance.id')
                    ->whereRaw('latest_location.id = (select id from location_logs where attendance_id = attendance.id order by recorded_at desc, id desc limit 1)');
            })
            ->with(['employee:id,name,employee_code,office_id', 'office:id,name'])
            ->whereNotNull('check_in')
            ->whereNull('check_out')
            ->whereHas('office', fn ($query) => $query->where('status', 'active'))
            ->orderBy('attendance.check_in')
            ->get()
            ->map(function (Attendance $attendance) {
                return [
                    'employee_id' => $attendance->employee_id,
                    'name' => $attendance->employee->name,
                    'employee_code' => $attendance->employee->employee_code,
                    'office' => $attendance->office?->name,
                    'attendance_id' => $attendance->id,
                    'check_in' => $attendance->check_in,
                    'last_location' => $attendance->live_latitude !== null ? [
                        'latitude' => (float) $attendance->live_latitude,
                        'longitude' => (float) $attendance->live_longitude,
                        'accuracy' => (float) $attendance->live_accuracy,
                        'recorded_at' => $attendance->live_recorded_at,
                    ] : null,
                    'status' => 'working',
                ];
            });

        return response()->json($working);
    }

    public function charts()
    {
        $from = now()->subDays(29)->toDateString();
        return response()->json([
            'daily' => Attendance::selectRaw('attendance_date as date, count(*) as total, sum(case when status in ("present","late","half_day","partial","work_from_home") then 1 else 0 end) as present, sum(case when status = "late" then 1 else 0 end) as late')->where('attendance_date','>=',$from)->groupBy('attendance_date')->orderBy('attendance_date')->get(),
            'departments' => Attendance::join('employees','employees.id','=','attendance.employee_id')->join('departments','departments.id','=','employees.department_id')->where('attendance_date','>=',$from)->selectRaw('departments.name, count(*) as total')->groupBy('departments.id','departments.name')->orderByDesc('total')->limit(20)->get(),
        ]);
    }
}
