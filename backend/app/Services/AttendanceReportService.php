<?php

namespace App\Services;

use App\Models\Attendance;
use Illuminate\Database\Eloquent\Builder;

class AttendanceReportService
{
    public function query(array $filters): Builder
    {
        $query = Attendance::query()->with([
            'employee:id,name,employee_code,department_id,office_id',
            'employee.department:id,name',
            'office:id,name',
        ]);

        foreach (['employee_id', 'status', 'mode'] as $key) {
            if (isset($filters[$key])) {
                $query->where("attendance.$key", $filters[$key]);
            }
        }

        if (isset($filters['office_id'])) {
            $query->where('attendance.office_id', $filters['office_id']);
        }

        if (isset($filters['department_id'])) {
            $query->whereHas('employee', fn ($employee) => $employee
                ->where('department_id', $filters['department_id']));
        }

        if (isset($filters['from'])) {
            $query->where('attendance_date', '>=', $filters['from']);
        }

        if (isset($filters['to'])) {
            $query->where('attendance_date', '<=', $filters['to']);
        }

        if (isset($filters['search'])) {
            $query->whereHas('employee', fn ($employee) => $employee
                ->where('name', 'like', '%'.$filters['search'].'%')
                ->orWhere('employee_code', 'like', '%'.$filters['search'].'%'));
        }

        return $query->orderBy(
            $filters['sort'] ?? 'attendance_date',
            $filters['direction'] ?? 'desc'
        );
    }

    public function row(Attendance $attendance): array
    {
        return [
            'date' => $attendance->attendance_date->toDateString(),
            'employee' => $attendance->employee->name,
            'employee_code' => $attendance->employee->employee_code,
            'department' => $attendance->employee->department?->name,
            'office' => $attendance->office?->name,
            'mode' => $attendance->mode === 'wfh' ? 'Work From Home' : 'Office',
            'status' => $this->statusLabel($attendance->status),
            'check_in' => $attendance->check_in?->toDateTimeString(),
            'check_out' => $attendance->check_out?->toDateTimeString(),
            'working_hours' => $this->duration($attendance->working_minutes),
            'late' => $this->duration($attendance->late_minutes),
            'early_departure' => $this->duration($attendance->early_departure_minutes),
            'overtime' => $this->duration($attendance->overtime_minutes),
        ];
    }

    private function duration(?int $minutes): string
    {
        if ($minutes === null) {
            return '—';
        }

        $safeMinutes = max(0, $minutes);

        return intdiv($safeMinutes, 60).'h '
            .str_pad((string) ($safeMinutes % 60), 2, '0', STR_PAD_LEFT)
            .'m';
    }

    private function statusLabel(string $status): string
    {
        return [
            'present' => 'Present',
            'late' => 'Late',
            'half_day' => 'Half day',
            'partial' => 'Partial attendance',
            'absent' => 'Absent',
            'work_from_home' => 'Work From Home',
        ][$status] ?? ucwords(str_replace('_', ' ', $status));
    }
}
