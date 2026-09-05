<?php

namespace App\Policies;

use App\Models\Employee;
use App\Models\LocationLog;

class LocationLogPolicy
{
    public function viewAny(Employee $user): bool
    {
        return $user->isAdmin() || $user->exists;
    }

    public function view(Employee $user, LocationLog $locationLog): bool
    {
        return $user->isAdmin() || $locationLog->employee_id === $user->id;
    }
}
