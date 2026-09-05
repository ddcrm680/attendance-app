<?php

namespace App\Providers;

use App\Models\Attendance;
use App\Models\Department;
use App\Models\Employee;
use App\Models\LocationLog;
use App\Models\Office;
use App\Policies\AttendancePolicy;
use App\Policies\DepartmentPolicy;
use App\Policies\EmployeePolicy;
use App\Policies\LocationLogPolicy;
use App\Policies\OfficePolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Attendance::class => AttendancePolicy::class,
        Department::class => DepartmentPolicy::class,
        Employee::class => EmployeePolicy::class,
        LocationLog::class => LocationLogPolicy::class,
        Office::class => OfficePolicy::class,
    ];
}
