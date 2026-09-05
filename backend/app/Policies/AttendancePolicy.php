<?php

namespace App\Policies;

use App\Models\Attendance;
use App\Models\Employee;

class AttendancePolicy
{
    public function viewAny(Employee $user): bool
    {
        return $user->isAdmin() || $user->exists;
    }

    public function view(Employee $user, Attendance $attendance): bool
    {
        return $user->isAdmin() || $attendance->employee_id === $user->id;
    }
}
