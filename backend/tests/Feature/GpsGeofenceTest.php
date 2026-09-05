<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\AttendanceSetting;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Office;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GpsGeofenceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void { parent::setUp(); Storage::fake(config('attendance.photo_disk')); }

    public function test_valid_location_is_verified_persisted_and_logged_on_punch_in(): void
    {
        [$employee] = $this->employee(); Sanctum::actingAs($employee);
        $this->post('/api/attendance/check-in', $this->location(['photo' => $this->photo(), 'position_timestamp' => now()->valueOf()]))->assertCreated();
        $attendance = Attendance::first();
        $this->assertDatabaseHas('attendance', ['id' => $attendance->id, 'check_in_latitude' => 28.6139, 'check_in_longitude' => 77.2090, 'check_in_accuracy' => 10]);
        $this->assertDatabaseHas('location_logs', ['employee_id' => $employee->id, 'attendance_id' => $attendance->id, 'latitude' => 28.6139, 'accuracy' => 10]);
    }

    public function test_invalid_coordinates_and_accuracy_are_rejected_server_side(): void
    {
        [$employee] = $this->employee(['gps_accuracy_threshold_meters' => 20]); Sanctum::actingAs($employee);
        $this->postJson('/api/attendance/check-in', $this->location(['latitude' => 91]))->assertUnprocessable()->assertJsonValidationErrors('latitude');
        $this->postPhoto('/api/attendance/check-in', $this->location(['accuracy' => 21, 'photo' => $this->photo()]))->assertUnprocessable()->assertJsonValidationErrors('accuracy');
        $this->postJson('/api/attendance/check-in', $this->location(['longitude' => 181]))->assertUnprocessable()->assertJsonValidationErrors('longitude');
    }

    public function test_outside_location_and_client_geofence_claim_cannot_bypass_server_check(): void
    {
        [$employee] = $this->employee(); Sanctum::actingAs($employee);
        $this->postPhoto('/api/attendance/check-in', $this->location(['latitude' => 28.7000, 'distance_meters' => 0, 'inside' => true, 'photo' => $this->photo()]))->assertUnprocessable()->assertJsonValidationErrors('location');
        $this->assertDatabaseCount('attendance', 0);
    }

    public function test_inactive_assigned_office_and_stale_position_are_rejected(): void
    {
        [$employee, $office] = $this->employee(); Sanctum::actingAs($employee);
        $office->update(['status' => 'inactive']);
        $this->postPhoto('/api/attendance/check-in', $this->location(['photo' => $this->photo()]))->assertUnprocessable()->assertJsonValidationErrors('office');
        $office->update(['status' => 'active']);
        $employee->refresh();
        $this->postPhoto('/api/attendance/check-in', $this->location(['photo' => $this->photo(), 'position_timestamp' => now()->subSeconds(config('attendance.max_position_age_seconds') + 1)->valueOf()]))->assertUnprocessable()->assertJsonValidationErrors('position_timestamp');
        $office->update(['radius' => 0]);
        $employee->refresh();
        $this->postPhoto('/api/attendance/check-in', $this->location(['photo' => $this->photo()]))->assertUnprocessable()->assertJsonValidationErrors('office');
    }

    public function test_employee_uses_their_assigned_office_not_another_office(): void
    {
        [, $first] = $this->employee();
        [$employee, $assigned] = $this->employee([], 12.9716, 77.5946);
        Sanctum::actingAs($employee);
        $this->post('/api/attendance/check-in', ['latitude' => 12.9716, 'longitude' => 77.5946, 'accuracy' => 10, 'photo' => $this->photo()])->assertCreated();
        $this->assertSame($assigned->id, Attendance::first()->office_id);
        $this->assertNotSame($first->id, Attendance::first()->office_id);
    }

    public function test_punch_out_and_location_update_are_equally_geofenced_and_owned(): void
    {
        [$employee] = $this->employee(); Sanctum::actingAs($employee);
        $this->post('/api/attendance/check-in', $this->location(['photo' => $this->photo()]))->assertCreated();
        $this->postPhoto('/api/attendance/check-out', $this->location(['longitude' => 77.3000, 'photo' => $this->photo()]))->assertUnprocessable()->assertJsonValidationErrors('location');
        $this->postJson('/api/location/update', $this->location(['employee_id' => 999]))->assertStatus(202);
        $this->assertDatabaseHas('location_logs', ['employee_id' => $employee->id]);
        [$other] = $this->employee();
        $otherAttendance = Attendance::create(['employee_id' => $other->id, 'office_id' => $other->office_id, 'attendance_date' => '2026-01-01']);
        $this->getJson('/api/location/history?attendance_id='.$otherAttendance->id)->assertOk()->assertJsonCount(0);
    }

    private function employee(array $rules = [], float $latitude = 28.6139, float $longitude = 77.2090): array
    {
        $department = Department::firstOrCreate(['name' => 'Engineering']);
        $office = Office::create(['name' => 'Office '.uniqid(), 'latitude' => $latitude, 'longitude' => $longitude, 'radius' => 200]);
        AttendanceSetting::create(array_merge(['office_id' => $office->id], $rules));
        $employee = Employee::create(['employee_code' => 'EMP-'.uniqid(), 'name' => 'Employee', 'email' => uniqid().'@example.test', 'mobile' => '9'.str_pad((string) random_int(1, 999999999), 9, '0', STR_PAD_LEFT), 'password' => 'password', 'department_id' => $department->id, 'office_id' => $office->id]);
        return [$employee, $office];
    }

    private function location(array $extra = []): array { return array_merge(['latitude' => 28.6139, 'longitude' => 77.2090, 'accuracy' => 10], $extra); }
    private function photo(): UploadedFile { return UploadedFile::fake()->image('selfie.jpg', 480, 480); }
    private function postPhoto(string $uri, array $data) { return $this->withHeader('Accept', 'application/json')->post($uri, $data); }
}
