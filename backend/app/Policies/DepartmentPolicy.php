<?php

namespace App\Policies;

use App\Models\Department;
use App\Models\Employee;

class DepartmentPolicy
{
    public function viewAny(Employee $user): bool
    {
        return $user->isAdmin();
    }

    public function view(Employee $user, Department $department): bool
    {
        return $user->isAdmin();
    }

    public function create(Employee $user): bool
    {
        return $user->isAdmin();
    }

    public function update(Employee $user, Department $department): bool
    {
        return $user->isAdmin();
    }

    public function delete(Employee $user, Department $department): bool
    {
        return $user->isAdmin();
    }
}
