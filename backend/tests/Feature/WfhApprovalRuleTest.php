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

    public function test_wfh_with_required_gps_accepts_a_current_location_outside_the_office_geofence(): void
    {
        [$employee] = $this->employee(['wfh_gps_required' => true]);

        Sanctum::actingAs($employee);

        $this->postJson('/api/attendance/check-in', [
            'mode' => 'wfh',
            'latitude' => 19.0760,
            'longitude' => 72.8777,
            'accuracy' => 10,
            'position_timestamp' => now()->valueOf(),
        ])->assertCreated();

        $attendance = Attendance::firstOrFail();
        $this->assertSame('wfh', $attendance->mode);
        $this->assertSame(19.076, (float) $attendance->check_in_latitude);
        $this->assertNull($attendance->check_in_distance_meters);
        $this->assertDatabaseHas('location_logs', [
            'employee_id' => $employee->id,
            'attendance_id' => $attendance->id,
            'latitude' => 19.076,
            'longitude' => 72.8777,
            'accuracy' => 10,
        ]);
    }

    public function test_wfh_with_required_gps_rejects_poor_accuracy(): void
    {
        [$employee] = $this->employee([
            'wfh_gps_required' => true,
            'gps_accuracy_threshold_meters' => 20,
        ]);

        Sanctum::actingAs($employee);

        $this->postJson('/api/attendance/check-in', [
            'mode' => 'wfh',
            'latitude' => 19.0760,
            'longitude' => 72.8777,
            'accuracy' => 21,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('accuracy');
    }

    public function test_wfh_with_required_gps_rejects_a_stale_location(): void
    {
        [$employee] = $this->employee(['wfh_gps_required' => true]);

        Sanctum::actingAs($employee);

        $this->postJson('/api/attendance/check-in', [
            'mode' => 'wfh',
            'latitude' => 19.0760,
            'longitude' => 72.8777,
            'accuracy' => 10,
            'position_timestamp' => now()->subSeconds(config('attendance.max_position_age_seconds') + 1)->valueOf(),
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('position_timestamp');
    }

    public function test_wfh_check_out_can_omit_gps_and_photo_when_the_effective_policy_allows_it(): void
    {
        [$employee] = $this->employee([
            'wfh_gps_required' => false,
            'wfh_photo_required' => false,
        ]);

        Sanctum::actingAs($employee);
        $this->postJson('/api/attendance/check-in', ['mode' => 'wfh'])->assertCreated();

        $this->postJson('/api/attendance/check-out', ['mode' => 'wfh'])
            ->assertOk()
            ->assertJsonPath('attendance.mode', 'wfh');

        $this->assertDatabaseHas('attendance', [
            'employee_id' => $employee->id,
            'mode' => 'wfh',
            'check_out_latitude' => null,
            'check_out_photo_path' => null,
        ]);
    }

    public function test_wfh_check_out_requires_gps_when_the_effective_policy_requires_it(): void
    {
        [$employee] = $this->employee([
            'wfh_gps_required' => true,
            'wfh_photo_required' => false,
        ]);

        Sanctum::actingAs($employee);
        $this->postJson('/api/attendance/check-in', [
            'mode' => 'wfh',
            'latitude' => 19.0760,
            'longitude' => 72.8777,
            'accuracy' => 10,
        ])->assertCreated();

        $this->postJson('/api/attendance/check-out', ['mode' => 'wfh'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('location');

        $this->postJson('/api/attendance/check-out', [
            'mode' => 'wfh',
            'latitude' => 19.0760,
            'longitude' => 72.8777,
            'accuracy' => 10,
        ])->assertOk();

        $this->assertDatabaseHas('attendance', [
            'employee_id' => $employee->id,
            'check_out_latitude' => 19.076,
            'check_out_longitude' => 72.8777,
            'check_out_accuracy' => 10,
        ]);
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
