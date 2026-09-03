<?php

namespace Database\Seeders;

use App\Models\AttendanceSetting;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Office;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $engineering = Department::create(['name' => 'Engineering']);
        $sales = Department::create(['name' => 'Sales']);

        $office = Office::create([
            'name' => 'Delhi Head Office',
            'address' => 'Connaught Place, New Delhi',
            'latitude' => 28.6139,
            'longitude' => 77.2090,
            'radius' => 200,
        ]);

        AttendanceSetting::create(['office_id' => $office->id]);
        // Global fallback used when an office has no override row.
        AttendanceSetting::create(['office_id' => null]);

        Employee::create([
            'employee_code' => 'ADM-001',
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'mobile' => '9990000001',
            'password' => 'password123',
            'role' => 'super_admin',
            'department_id' => $engineering->id,
            'designation' => 'System Administrator',
            'office_id' => $office->id,
            'joining_date' => now()->subYears(2),
        ]);

        Employee::create([
            'employee_code' => 'EMP-1042',
            'name' => 'Raj Kumar',
            'email' => 'raj.kumar@example.com',
            'mobile' => '9990000002',
            'password' => 'password123',
            'role' => 'employee',
            'department_id' => $engineering->id,
            'designation' => 'Software Engineer',
            'office_id' => $office->id,
            'joining_date' => now()->subMonths(8),
        ]);

        Employee::create([
            'employee_code' => 'EMP-1043',
            'name' => 'Amit Sharma',
            'email' => 'amit.sharma@example.com',
            'mobile' => '9990000003',
            'password' => 'password123',
            'role' => 'employee',
            'department_id' => $sales->id,
            'designation' => 'Sales Executive',
            'office_id' => $office->id,
            'joining_date' => now()->subMonths(3),
        ]);
    }
}
