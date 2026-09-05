<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_sensitive_employee_creation_is_audited_without_password_metadata(): void
    {
        $admin = $this->employee('super_admin', 'admin@example.test'); Sanctum::actingAs($admin);
        $this->postJson('/api/admin/employees', ['employee_code' => 'NEW-001', 'name' => 'New Employee', 'email' => 'new@example.test', 'mobile' => '9000000011', 'password' => 'password123', 'role' => 'employee'])->assertCreated();
        $log = AuditLog::firstOrFail();
        $this->assertSame($admin->id, $log->actor_id); $this->assertSame('employee.created', $log->action); $this->assertSame('Employee', $log->resource_type);
        $this->assertArrayNotHasKey('password', $log->metadata ?? []);
    }

    public function test_audit_api_is_admin_only_filterable_and_paginated(): void
    {
        $employee = $this->employee('employee', 'employee@example.test'); Sanctum::actingAs($employee); $this->getJson('/api/admin/audit-logs')->assertForbidden();
        $admin = $this->employee('super_admin', 'admin@example.test'); AuditLog::create(['actor_id' => $admin->id, 'action' => 'office.updated', 'resource_type' => 'Office', 'resource_id' => 5, 'metadata' => ['changed_fields' => ['status']]]); AuditLog::create(['actor_id' => $admin->id, 'action' => 'employee.updated', 'resource_type' => 'Employee', 'resource_id' => $employee->id]);
        Sanctum::actingAs($admin); $this->getJson('/api/admin/audit-logs?action=office.updated&per_page=1')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.action', 'office.updated');
    }

    public function test_hr_cannot_escalate_or_modify_protected_super_admin_and_logs_are_immutable(): void
    {
        $hr = $this->employee('hr_admin', 'hr@example.test'); $super = $this->employee('super_admin', 'super@example.test'); Sanctum::actingAs($hr);
        $this->patchJson('/api/admin/employees/'.$super->id, ['name' => 'Changed'])->assertForbidden();
        $this->postJson('/api/admin/employees', ['employee_code' => 'BAD-001', 'name' => 'Bad', 'email' => 'bad@example.test', 'mobile' => '9000000012', 'password' => 'password123', 'role' => 'super_admin'])->assertForbidden();
        $log = AuditLog::create(['actor_id' => $super->id, 'action' => 'test', 'resource_type' => 'System']);
        $this->expectException(\LogicException::class); $log->update(['action' => 'changed']);
    }

    private function employee(string $role, string $email): Employee { return Employee::create(['employee_code' => strtoupper($role).'-'.uniqid(), 'name' => $role, 'email' => $email, 'mobile' => '9'.str_pad((string) random_int(1,999999999), 9, '0', STR_PAD_LEFT), 'password' => 'password', 'role' => $role]); }
}
