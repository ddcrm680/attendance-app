<?php

namespace App\Policies;

use App\Models\Employee;

class EmployeePolicy
{
    public function viewAny(Employee $user): bool
    {
        return $user->isAdmin();
    }

    public function view(Employee $user, Employee $target): bool
    {
        return $user->isAdmin() || $user->is($target);
    }

    public function create(Employee $user): bool
    {
        return $user->isAdmin();
    }

    public function update(Employee $user, Employee $target): bool
    {
        if ($target->isSuperAdmin()) return false;
        if ($user->isSuperAdmin()) {
            return ! $user->is($target);
        }

        return $user->isHrAdmin() && $target->hasRole('employee');
    }

    public function delete(Employee $user, Employee $target): bool
    {
        if ($target->isSuperAdmin()) return false;
        if ($user->is($target)) {
            return false;
        }

        return $user->isSuperAdmin() || ($user->isHrAdmin() && $target->hasRole('employee'));
    }
}
