<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\AttendanceSetting;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Office;
use App\Models\WfhRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WfhApprovalRuleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake(config('attendance.photo_disk'));
    }

    public function test_eligible_employee_can_punch_in_wfh_without_a_request_when_approval_is_not_required(): void
    {
        [$employee] = $this->employee(['wfh_approval_required' => false]);

        Sanctum::actingAs($employee);

        $this->postJson('/api/attendance/check-in', ['mode' => 'wfh'])
            ->assertCreated()
            ->assertJsonPath('attendance.status', 'work_from_home');

        $this->assertDatabaseHas('attendance', [
            'employee_id' => $employee->id,
            'mode' => 'wfh',
        ]);
    }

    public function test_eligible_employee_cannot_punch_in_wfh_without_approval_when_approval_is_required(): void
    {
        [$employee] = $this->employee(['wfh_approval_required' => true]);

        Sanctum::actingAs($employee);

        $this->postJson('/api/attendance/check-in', ['mode' => 'wfh'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('mode');

        $this->assertDatabaseCount('attendance', 0);
    }

    public function test_eligible_employee_can_punch_in_wfh_with_approval_when_approval_is_required(): void
    {
        [$employee] = $this->employee(['wfh_approval_required' => true]);
        WfhRequest::create([
            'employee_id' => $employee->id,
            'attendance_date' => now()->toDateString(),
            'status' => 'approved',
        ]);

        Sanctum::actingAs($employee);

        $this->postJson('/api/attendance/check-in', ['mode' => 'wfh'])
            ->assertCreated()
            ->assertJsonPath('attendance.status', 'work_from_home');
    }

    public function test_wfh_punch_in_is_rejected_when_wfh_is_not_allowed(): void
    {
        [$employee] = $this->employee(['wfh_enabled' => false]);

        Sanctum::actingAs($employee);

        $this->postJson('/api/attendance/check-in', ['mode' => 'wfh'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('mode');
    }

    public function test_wfh_punch_in_is_rejected_when_employee_is_not_eligible(): void
    {
        [$employee] = $this->employee([], false);

        Sanctum::actingAs($employee);

        $this->postJson('/api/attendance/check-in', ['mode' => 'wfh'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('mode');
    }

    public function test_wfh_photo_and_gps_requirements_still_apply_without_approval(): void
    {
        [$employee] = $this->employee([
            'wfh_approval_required' => false,
            'wfh_gps_required' => true,
            'wfh_photo_required' => true,
        ]);

        Sanctum::actingAs($employee);

        $this->postJson('/api/attendance/check-in', ['mode' => 'wfh'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('photo');

        $this->withHeader('Accept', 'application/json')->post('/api/attendance/check-in', [
            'mode' => 'wfh',
            'photo' => UploadedFile::fake()->image('selfie.jpg', 480, 480),
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('location');
    }

    /** @return array{Employee, Office} */
    private function employee(array $settings = [], bool $wfhEligible = true): array
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

        $employee = Employee::create([
            'employee_code' => 'EMP-'.uniqid(),
            'name' => 'Employee',
            'email' => uniqid().'@example.test',
            'mobile' => '9'.str_pad((string) random_int(1, 999999999), 9, '0', STR_PAD_LEFT),
            'password' => 'password',
            'department_id' => $department->id,
            'office_id' => $office->id,
            'wfh_eligible' => $wfhEligible,
        ]);

        return [$employee, $office];
    }
}
