<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\Office;
use App\Models\LocationLog;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AttendanceService
{
    public function __construct(private AttendanceSettingsResolver $settings, private AttendanceRules $rules) {}

    public function checkIn(Employee $employee, Office $office, ?array $location, ?string $photoPath, Carbon $now, string $mode = 'office'): Attendance
    {
        $setting = $this->settings->forOffice($office);
        $date = $this->rules->businessDate($now, $setting);

        return DB::transaction(function () use ($employee, $office, $location, $photoPath, $now, $setting, $date, $mode) {
            $attendance = Attendance::where('employee_id', $employee->id)->where('attendance_date', $date)->lockForUpdate()->first();
            if ($attendance?->check_in) {
                throw ValidationException::withMessages(['attendance' => ['You have already checked in for this shift.']]);
            }
            $checkIn = $this->rules->checkInValues($now, $date, $setting); if ($mode === 'wfh') $checkIn['status'] = 'work_from_home';
            $values = array_merge($checkIn, $location ? $this->attendanceLocation($location, 'check_in') : [], ['office_id' => $office->id, 'mode' => $mode, 'check_in' => $now, 'check_in_photo_path' => $photoPath]);
            $attendance = $attendance ? tap($attendance, fn ($record) => $record->update($values))->refresh() : Attendance::create(array_merge(['employee_id' => $employee->id, 'attendance_date' => $date], $values));
            if ($location) $this->logLocation($attendance, $employee, $location, $now);
            return $attendance;
        });
    }

    public function checkOut(Employee $employee, Carbon $now, ?array $location, ?string $photoPath): Attendance
    {
        $candidate = Attendance::where('employee_id', $employee->id)->whereNotNull('check_in')->whereNull('check_out')
            ->orderByDesc('attendance_date')->first();
        if (! $candidate) {
            throw ValidationException::withMessages(['attendance' => ['You have not checked in for an open shift.']]);
        }

        return DB::transaction(function () use ($candidate, $employee, $now, $location, $photoPath) {
            $attendance = Attendance::lockForUpdate()->findOrFail($candidate->id);
            if ($attendance->check_out) {
                throw ValidationException::withMessages(['attendance' => ['You have already checked out for this shift.']]);
            }
            $checkout=$this->rules->checkOutValues($attendance, $now, $this->settings->forOffice($attendance->office)); if($attendance->mode==='wfh')$checkout['status']='work_from_home';
            $values = array_merge($checkout, $location ? $this->attendanceLocation($location, 'check_out') : [], ['check_out' => $now, 'check_out_photo_path' => $photoPath]);
            $attendance->update($values);
            $attendance = $attendance->refresh();
            if ($location) $this->logLocation($attendance, $employee, $location, $now);
            return $attendance;
        });
    }

    private function attendanceLocation(array $location, string $prefix): array
    {
        return ["{$prefix}_latitude" => $location['latitude'], "{$prefix}_longitude" => $location['longitude'], "{$prefix}_accuracy" => $location['accuracy'], "{$prefix}_distance_meters" => $location['distance_meters']];
    }

    private function logLocation(Attendance $attendance, Employee $employee, array $location, Carbon $recordedAt): void
    {
        LocationLog::create(['employee_id' => $employee->id, 'attendance_id' => $attendance->id, 'latitude' => $location['latitude'], 'longitude' => $location['longitude'], 'accuracy' => $location['accuracy'], 'recorded_at' => $recordedAt]);
    }
}
