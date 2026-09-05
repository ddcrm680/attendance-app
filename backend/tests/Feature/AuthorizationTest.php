<?php

namespace Tests\Feature;

use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_cannot_access_admin_resources(): void
    {
        $employee = $this->employee('employee');
        Sanctum::actingAs($employee);

        $this->getJson('/api/admin/dashboard')
            ->assertForbidden();
    }

    public function test_hr_admin_can_list_employees_but_cannot_modify_an_administrator(): void
    {
        $hrAdmin = $this->employee('hr_admin', 'hr@example.test', '9000000002');
        $superAdmin = $this->employee('super_admin', 'super@example.test', '9000000003');
        Sanctum::actingAs($hrAdmin);

        $this->getJson('/api/admin/employees')
            ->assertOk();

        $this->patchJson('/api/admin/employees/'.$superAdmin->id, [
            'name' => 'Attempted change',
        ])->assertForbidden();
    }

    public function test_hr_admin_cannot_create_another_administrator(): void
    {
        $hrAdmin = $this->employee('hr_admin', 'hr@example.test', '9000000002');
        Sanctum::actingAs($hrAdmin);

        $this->postJson('/api/admin/employees', [
            'employee_code' => 'NEW-001',
            'name' => 'New Administrator',
            'email' => 'new-admin@example.test',
            'mobile' => '9000000004',
            'password' => 'password123',
            'role' => 'super_admin',
        ])->assertForbidden();
    }

    public function test_login_is_rate_limited_per_identifier_and_ip(): void
    {
        $employee = $this->employee('employee');

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/login', [
                'identifier' => $employee->email,
                'password' => 'wrong-password',
            ])->assertUnauthorized();
        }

        $this->postJson('/api/login', [
            'identifier' => $employee->email,
            'password' => 'wrong-password',
        ])->assertStatus(429);
    }

    public function test_login_assigns_an_ability_matching_the_employee_role(): void
    {
        $employee = $this->employee('employee');

        $response = $this->postJson('/api/login', [
            'identifier' => $employee->email,
            'password' => 'test-password',
        ])->assertOk();

        $token = PersonalAccessToken::findToken($response->json('token'));

        $this->assertNotNull($token);
        $this->assertSame(['employee'], $token->abilities);
    }

    public function test_inactive_accounts_cannot_log_in(): void
    {
        $employee = $this->employee('employee');
        $employee->update(['status' => 'inactive']);

        $this->postJson('/api/login', [
            'identifier' => $employee->email,
            'password' => 'test-password',
        ])->assertForbidden();
    }

    private function employee(
        string $role,
        string $email = 'employee@example.test',
        string $mobile = '9000000001',
    ): Employee {
        return Employee::create([
            'employee_code' => strtoupper(str_replace('_', '-', $role)).'-001',
            'name' => ucfirst(str_replace('_', ' ', $role)),
            'email' => $email,
            'mobile' => $mobile,
            'password' => 'test-password',
            'role' => $role,
        ]);
    }
}
