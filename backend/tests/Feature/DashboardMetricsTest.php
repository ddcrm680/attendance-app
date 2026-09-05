<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardMetricsTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_aggregates_today_and_does_not_count_approved_leave_as_absent(): void
    {
        $admin = $this->employee('super_admin', 'admin@example.test'); $present = $this->employee('employee', 'present@example.test'); $onLeave = $this->employee('employee', 'leave@example.test');
        Attendance::create(['employee_id' => $present->id, 'attendance_date' => now()->toDateString(), 'check_in' => now(), 'status' => 'late', 'late_minutes' => 5]);
        $type = LeaveType::create(['name' => 'Annual']); LeaveRequest::create(['employee_id' => $onLeave->id, 'leave_type_id' => $type->id, 'start_date' => now()->toDateString(), 'end_date' => now()->toDateString(), 'status' => 'approved']);
        Sanctum::actingAs($admin);
        $response = $this->getJson('/api/admin/dashboard')->assertOk();
        $response->assertJsonPath('total_employees', 3);
        $response->assertJsonPath('present_today', 1);
        $response->assertJsonPath('late_today', 1);
        $response->assertJsonPath('on_leave', 1);
        $response->assertJsonPath('absent_today', 1);
    }

    private function employee(string $role, string $email): Employee { return Employee::create(['employee_code' => strtoupper($role).'-'.uniqid(), 'name' => $email, 'email' => $email, 'mobile' => '9'.str_pad((string) random_int(1,999999999), 9, '0', STR_PAD_LEFT), 'password' => 'password', 'role' => $role]); }
}
