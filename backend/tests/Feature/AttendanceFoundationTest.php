<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Office;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AttendanceFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_employee_can_log_in_with_the_existing_identifier_contract(): void
    {
        $employee = $this->employee();

        $this->postJson('/api/login', [
            'identifier' => $employee->email,
            'password' => 'test-password',
        ])
            ->assertOk()
            ->assertJsonPath('employee.id', $employee->id)
            ->assertJsonStructure(['token']);
    }

    public function test_daily_attendance_is_unique_per_employee(): void
    {
        $employee = $this->employee();

        Attendance::create([
            'employee_id' => $employee->id,
            'office_id' => $employee->office_id,
            'attendance_date' => '2026-01-05',
        ]);

        $this->expectException(QueryException::class);

        Attendance::create([
            'employee_id' => $employee->id,
            'office_id' => $employee->office_id,
            'attendance_date' => '2026-01-05',
        ]);
    }

    public function test_employee_attendance_history_only_contains_their_own_records(): void
    {
        $employee = $this->employee();
        $otherEmployee = $this->employee('EMP-002', 'other@example.test', '9000000002');

        Attendance::create([
            'employee_id' => $employee->id,
            'office_id' => $employee->office_id,
            'attendance_date' => '2026-01-05',
        ]);
        Attendance::create([
            'employee_id' => $otherEmployee->id,
            'office_id' => $otherEmployee->office_id,
            'attendance_date' => '2026-01-06',
        ]);

        Sanctum::actingAs($employee);

        $this->getJson('/api/attendance/history')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.employee_id', $employee->id);
    }

    public function test_employee_can_complete_the_existing_geofenced_attendance_flow(): void
    {
        $employee = $this->employee();

        Sanctum::actingAs($employee);

        $this->postJson('/api/attendance/check-in', [
            'latitude' => 28.6139,
            'longitude' => 77.2090,
            'accuracy' => 10,
            'photo' => UploadedFile::fake()->image('selfie.jpg', 480, 480),
        ])
            ->assertCreated()
            ->assertJsonPath('attendance.employee_id', $employee->id);

        $this->assertDatabaseHas('attendance', [
            'employee_id' => $employee->id,
            'attendance_date' => now()->toDateString(),
        ]);

        Sanctum::actingAs($employee);

        $this->postJson('/api/attendance/check-out', [
            'latitude' => 28.6139,
            'longitude' => 77.2090,
            'accuracy' => 10,
            'photo' => UploadedFile::fake()->image('selfie.jpg', 480, 480),
        ])
            ->assertOk()
            ->assertJsonPath('attendance.employee_id', $employee->id);

        $this->assertDatabaseHas('attendance', [
            'employee_id' => $employee->id,
            'attendance_date' => now()->toDateString(),
        ]);
    }

    private function employee(
        string $employeeCode = 'EMP-001',
        string $email = 'employee@example.test',
        string $mobile = '9000000001',
    ): Employee {
        $department = Department::firstOrCreate(['name' => 'Engineering']);
        $office = Office::firstOrCreate(
            ['name' => 'Test Office'],
            [
                'latitude' => 28.6139,
                'longitude' => 77.2090,
                'radius' => 200,
            ],
        );

        return Employee::create([
            'employee_code' => $employeeCode,
            'name' => 'Test Employee',
            'email' => $email,
            'mobile' => $mobile,
            'password' => 'test-password',
            'department_id' => $department->id,
            'office_id' => $office->id,
        ]);
    }
}
