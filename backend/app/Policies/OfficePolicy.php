<?php

namespace App\Policies;

use App\Models\Employee;
use App\Models\Office;

class OfficePolicy
{
    public function viewAny(Employee $user): bool
    {
        return $user->isAdmin();
    }

    public function view(Employee $user, Office $office): bool
    {
        return $user->isAdmin();
    }

    public function create(Employee $user): bool
    {
        return $user->isAdmin();
    }

    public function update(Employee $user, Office $office): bool
    {
        return $user->isAdmin();
    }

    public function delete(Employee $user, Office $office): bool
    {
        return $user->isAdmin();
    }
}
