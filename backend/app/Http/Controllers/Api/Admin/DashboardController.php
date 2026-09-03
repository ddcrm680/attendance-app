<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\LocationLog;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function stats()
    {
        $today = Carbon::today()->toDateString();
        $totalEmployees = Employee::where('status', 'active')->count();

        $todayAttendance = Attendance::where('attendance_date', $today)->get();

        $present = $todayAttendance->whereIn('status', ['present', 'late', 'half_day', 'work_from_home'])->count();
        $late = $todayAttendance->where('status', 'late')->count();
        $currentlyWorking = $todayAttendance->whereNotNull('check_in')->whereNull('check_out')->count();
        $checkedOut = $todayAttendance->whereNotNull('check_out')->count();
        $absent = max($totalEmployees - $present, 0);

        $avgWorkingMinutes = $todayAttendance->where('working_minutes', '>', 0)->avg('working_minutes') ?? 0;

        return response()->json([
            'date' => $today,
            'total_employees' => $totalEmployees,
            'present_today' => $present,
            'absent_today' => $absent,
            'late_today' => $late,
            'currently_working' => $currentlyWorking,
            'checked_out' => $checkedOut,
            'average_working_minutes' => round($avgWorkingMinutes),
        ]);
    }

    public function liveEmployees()
    {
        $today = Carbon::today()->toDateString();

        $working = Attendance::with(['employee.department', 'office'])
            ->where('attendance_date', $today)
            ->whereNotNull('check_in')
            ->whereNull('check_out')
            ->get()
            ->map(function (Attendance $attendance) {
                $lastLog = LocationLog::where('attendance_id', $attendance->id)
                    ->orderByDesc('recorded_at')
                    ->first();

                return [
                    'employee_id' => $attendance->employee_id,
                    'name' => $attendance->employee->name,
                    'employee_code' => $attendance->employee->employee_code,
                    'department' => $attendance->employee->department?->name,
                    'office' => $attendance->office?->name,
                    'check_in' => $attendance->check_in,
                    'last_location' => $lastLog ? [
                        'latitude' => $lastLog->latitude,
                        'longitude' => $lastLog->longitude,
                        'accuracy' => $lastLog->accuracy,
                        'recorded_at' => $lastLog->recorded_at,
                    ] : null,
                    'status' => 'working',
                ];
            });

        return response()->json($working);
    }
}
