<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\Office;
use App\Models\WfhRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminListQueryTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_queries_filter_and_paginate_on_the_server(): void
    {
        $admin = $this->employee('ADMIN', 'super_admin'); $engineering = Department::create(['name' => 'Engineering']); $sales = Department::create(['name' => 'Sales']);
        $central = $this->office('Central'); $remote = $this->office('Remote');
        $match = $this->employee('ALICE-42', 'employee', ['name' => 'Alice Query', 'email' => 'alice@query.test', 'department_id' => $engineering->id, 'office_id' => $central->id, 'status' => 'active', 'wfh_eligible' => true]);
        $this->employee('BOB-42', 'employee', ['department_id' => $sales->id, 'office_id' => $remote->id, 'status' => 'inactive']); Sanctum::actingAs($admin);
        $this->getJson('/api/admin/employees?search=Alice&department_id='.$engineering->id.'&office_id='.$central->id.'&status=active&wfh_eligible=1&per_page=1')->assertOk()->assertJsonPath('data.0.id', $match->id)->assertJsonPath('current_page', 1)->assertJsonPath('last_page', 1);
        $this->getJson('/api/admin/employees?search=ALICE-42')->assertJsonPath('data.0.id', $match->id);
        $this->getJson('/api/admin/employees?search=alice@query.test')->assertJsonPath('data.0.id', $match->id);
        $this->getJson('/api/admin/employees?status=nope')->assertUnprocessable();
        Sanctum::actingAs($match); $this->getJson('/api/admin/employees')->assertForbidden();
    }

    public function test_office_queries_preserve_unfiltered_compatibility_and_validate_filters(): void
    {
        $admin = $this->employee('ADMIN', 'super_admin'); $central = $this->office('Central HQ', 'Main address', 'active'); $this->office('Dormant', 'Remote address', 'inactive'); Sanctum::actingAs($admin);
        $this->getJson('/api/admin/offices')->assertOk()->assertJsonIsArray();
        $this->getJson('/api/admin/offices?search=Main&status=active&per_page=1')->assertOk()->assertJsonPath('data.0.id', $central->id)->assertJsonPath('current_page', 1);
        $this->getJson('/api/admin/offices?status=bad')->assertUnprocessable(); Sanctum::actingAs($this->employee('USER')); $this->getJson('/api/admin/offices')->assertForbidden();
    }

    public function test_leave_and_wfh_queries_filter_paginate_validate_and_preserve_authorization(): void
    {
        $admin = $this->employee('ADMIN', 'super_admin'); $alice = $this->employee('ALICE', 'employee', ['name' => 'Alice Leave']); $bob = $this->employee('BOB'); $type = LeaveType::create(['name' => 'Annual']);
        $leave = LeaveRequest::create(['employee_id' => $alice->id, 'leave_type_id' => $type->id, 'start_date' => '2025-01-10', 'end_date' => '2025-01-12', 'status' => 'pending']); LeaveRequest::create(['employee_id' => $bob->id, 'leave_type_id' => $type->id, 'start_date' => '2025-02-10', 'end_date' => '2025-02-12', 'status' => 'approved']);
        $wfh = WfhRequest::create(['employee_id' => $alice->id, 'attendance_date' => '2025-01-11', 'status' => 'pending']); WfhRequest::create(['employee_id' => $bob->id, 'attendance_date' => '2025-02-11', 'status' => 'approved']); Sanctum::actingAs($admin);
        $this->getJson('/api/admin/leaves?search=Alice&leave_type_id='.$type->id.'&status=pending&from=2025-01-01&to=2025-01-31&per_page=1')->assertOk()->assertJsonPath('data.0.id', $leave->id)->assertJsonPath('current_page', 1);
        $this->getJson('/api/admin/wfh-requests?search=Alice&status=pending&from=2025-01-01&to=2025-01-31&per_page=1')->assertOk()->assertJsonPath('data.0.id', $wfh->id)->assertJsonPath('current_page', 1);
        $this->getJson('/api/admin/leaves?from=2025-02-01&to=2025-01-01')->assertUnprocessable(); $this->getJson('/api/admin/wfh-requests?status=bad')->assertUnprocessable();
        Sanctum::actingAs($alice); $this->getJson('/api/admin/leaves')->assertForbidden(); $this->getJson('/api/admin/wfh-requests')->assertForbidden();
    }

    private function office(string $name, string $address = 'Address', string $status = 'active'): Office { return Office::create(['name' => $name, 'address' => $address, 'latitude' => 28.6, 'longitude' => 77.2, 'radius' => 200, 'status' => $status]); }
    private function employee(string $code, string $role = 'employee', array $extra = []): Employee { return Employee::create($extra + ['employee_code' => $code, 'name' => $code, 'email' => strtolower($code).uniqid().'@test.local', 'mobile' => '9'.str_pad((string) random_int(1, 999999999), 9, '0', STR_PAD_LEFT), 'password' => 'password', 'role' => $role, 'status' => 'active']); }
}
