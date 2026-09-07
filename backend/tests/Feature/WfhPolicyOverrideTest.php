<?php

namespace Tests\Feature;

use App\Models\AttendanceSetting;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Office;
use App\Services\AttendanceSettingsResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WfhPolicyOverrideTest extends TestCase
{
    use RefreshDatabase;

    public function test_null_overrides_inherit_the_office_wfh_policy(): void
    {
        [$employee] = $this->employee([
            'wfh_enabled' => true,
            'wfh_approval_required' => true,
        ]);

        $policy = app(AttendanceSettingsResolver::class)->wfhFor($employee);

        $this->assertTrue($policy->enabled);
        $this->assertTrue($policy->approvalRequired);
        Sanctum::actingAs($employee);
        $this->postJson('/api/attendance/check-in', ['mode' => 'wfh'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('mode');
    }

    public function test_employee_me_response_exposes_only_effective_wfh_availability(): void
    {
        [$employee] = $this->employee(['wfh_enabled' => false], [
            'wfh_enabled_override' => true,
        ]);

        Sanctum::actingAs($employee);
        $this->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('wfh_available', true)
            ->assertJsonMissingPath('wfh_enabled_override')
            ->assertJsonMissingPath('wfh_approval_required_override');
    }

    public function test_enabled_override_takes_precedence_over_a_disabled_office_policy(): void
    {
        [$employee] = $this->employee([
            'wfh_enabled' => false,
            'wfh_approval_required' => false,
        ], [
            'wfh_enabled_override' => true,
        ]);

        Sanctum::actingAs($employee);
        $this->postJson('/api/attendance/check-in', ['mode' => 'wfh'])
            ->assertCreated()
            ->assertJsonPath('attendance.mode', 'wfh');
    }

    public function test_disabled_override_takes_precedence_over_an_enabled_office_policy(): void
    {
        [$employee] = $this->employee([
            'wfh_enabled' => true,
            'wfh_approval_required' => false,
        ], [
            'wfh_enabled_override' => false,
        ]);

        Sanctum::actingAs($employee);
        $this->postJson('/api/attendance/check-in', ['mode' => 'wfh'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('mode');
    }

    public function test_approval_override_can_remove_an_office_approval_requirement(): void
    {
        [$employee] = $this->employee([
            'wfh_enabled' => true,
            'wfh_approval_required' => true,
        ], [
            'wfh_approval_required_override' => false,
        ]);

        Sanctum::actingAs($employee);
        $this->postJson('/api/attendance/check-in', ['mode' => 'wfh'])
            ->assertCreated();
    }

    public function test_approval_override_can_require_approval_when_the_office_does_not(): void
    {
        [$employee] = $this->employee([
            'wfh_enabled' => true,
            'wfh_approval_required' => false,
        ], [
            'wfh_approval_required_override' => true,
        ]);

        Sanctum::actingAs($employee);
        $this->postJson('/api/attendance/check-in', ['mode' => 'wfh'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('mode');
    }

    public function test_null_approval_override_falls_back_to_the_office_requirement(): void
    {
        [$employee] = $this->employee([
            'wfh_enabled' => true,
            'wfh_approval_required' => true,
        ], [
            'wfh_approval_required_override' => null,
        ]);

        Sanctum::actingAs($employee);
        $this->postJson('/api/attendance/check-in', ['mode' => 'wfh'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('mode');
    }

    public function test_ineligible_employee_remains_blocked_even_with_an_enabled_override(): void
    {
        [$employee] = $this->employee([
            'wfh_enabled' => false,
            'wfh_approval_required' => false,
        ], [
            'wfh_enabled_override' => true,
        ], false);

        Sanctum::actingAs($employee);
        $this->postJson('/api/attendance/check-in', ['mode' => 'wfh'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('mode');
    }

    public function test_admin_can_save_overrides_and_the_change_is_audited(): void
    {
        [$employee] = $this->employee();
        [$admin] = $this->employee([], [], true, 'super_admin');

        Sanctum::actingAs($admin);
        $this->patchJson('/api/admin/employees/'.$employee->id, [
            'wfh_enabled_override' => false,
            'wfh_approval_required_override' => true,
        ])->assertOk()
            ->assertJsonPath('wfh_enabled_override', false)
            ->assertJsonPath('wfh_approval_required_override', true);

        $this->assertDatabaseHas('employees', [
            'id' => $employee->id,
            'wfh_enabled_override' => false,
            'wfh_approval_required_override' => true,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'employee.updated',
            'resource_type' => 'Employee',
            'resource_id' => $employee->id,
        ]);
    }

    public function test_admin_can_create_an_employee_with_default_wfh_policy_inheritance(): void
    {
        [$admin] = $this->employee([], [], true, 'super_admin');
        [, $office] = $this->employee();

        Sanctum::actingAs($admin);
        $created = $this->postJson('/api/admin/employees', $this->employeePayload($office))
            ->assertCreated()
            ->assertJsonPath('wfh_eligible', false)
            ->assertJsonPath('wfh_enabled_override', null)
            ->assertJsonPath('wfh_approval_required_override', null)
            ->json();

        $this->assertDatabaseHas('employees', [
            'id' => $created['id'],
            'office_id' => $office->id,
            'wfh_eligible' => false,
            'wfh_enabled_override' => null,
            'wfh_approval_required_override' => null,
        ]);
    }

    public function test_admin_can_create_an_employee_with_wfh_eligibility_and_overrides(): void
    {
        [$admin] = $this->employee([], [], true, 'super_admin');
        [, $office] = $this->employee();

        Sanctum::actingAs($admin);
        $created = $this->postJson('/api/admin/employees', $this->employeePayload($office, [
            'wfh_eligible' => true,
            'wfh_enabled_override' => true,
            'wfh_approval_required_override' => false,
        ]))
            ->assertCreated()
            ->assertJsonPath('wfh_eligible', true)
            ->assertJsonPath('wfh_enabled_override', true)
            ->assertJsonPath('wfh_approval_required_override', false)
            ->json();

        $this->assertDatabaseHas('employees', [
            'id' => $created['id'],
            'wfh_eligible' => true,
            'wfh_enabled_override' => true,
            'wfh_approval_required_override' => false,
        ]);
    }

    private function employeePayload(Office $office, array $extra = []): array
    {
        return array_merge([
            'employee_code' => 'NEW-'.uniqid(),
            'name' => 'New Employee',
            'email' => uniqid().'@example.test',
            'mobile' => '9'.str_pad((string) random_int(1, 999999999), 9, '0', STR_PAD_LEFT),
            'password' => 'password123',
            'role' => 'employee',
            'office_id' => $office->id,
        ], $extra);
    }

    /** @return array{Employee, Office} */
    private function employee(array $settings = [], array $overrides = [], bool $eligible = true, string $role = 'employee'): array
    {
        $department = Department::firstOrCreate(['name' => 'Engineering']);
        $office = Office::create([
            'name' => 'Office '.uniqid(),
            'latitude' => 28.6139,
            'longitude' => 77.2090,
            'radius' => 200,
        ]);
        AttendanceSetting::create(array_merge([
            'office_id' => $office->id,
            'wfh_enabled' => true,
            'wfh_gps_required' => false,
            'wfh_photo_required' => false,
            'wfh_approval_required' => false,
            'wfh_tracking_enabled' => false,
        ], $settings));
        $employee = Employee::create(array_merge([
            'employee_code' => 'EMP-'.uniqid(),
            'name' => 'Employee',
            'email' => uniqid().'@example.test',
            'mobile' => '9'.str_pad((string) random_int(1, 999999999), 9, '0', STR_PAD_LEFT),
            'password' => 'password',
            'role' => $role,
            'department_id' => $department->id,
            'office_id' => $office->id,
            'wfh_eligible' => $eligible,
        ], $overrides));

        return [$employee, $office];
    }
}
