<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\AttendanceSetting;
use App\Models\Department;
use App\Models\Employee;
use App\Models\LocationLog;
use App\Models\Office;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LiveTrackingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void { parent::setUp(); Storage::fake(config('attendance.photo_disk')); }

    public function test_open_session_accepts_own_tracking_and_throttles_rapid_updates(): void
    {
        [$employee] = $this->employee(); Sanctum::actingAs($employee); $attendance = $this->checkIn();
        LocationLog::where('attendance_id', $attendance->id)->update(['recorded_at' => now()->subMinute()]);
        $this->postJson('/api/location/update', $this->location(['attendance_id' => $attendance->id]))->assertCreated()->assertJsonPath('location.attendance_id', $attendance->id);
        $this->postJson('/api/location/update', $this->location(['attendance_id' => $attendance->id]))->assertStatus(202)->assertJsonPath('tracking_interval_seconds', 60);
        $this->getJson('/api/location/tracking-status')->assertOk()->assertJsonPath('active', true)->assertJsonPath('attendance_id', $attendance->id);
    }

    public function test_closed_or_mismatched_sessions_cannot_receive_tracking_updates(): void
    {
        [$employee] = $this->employee(); Sanctum::actingAs($employee); $attendance = $this->checkIn();
        $this->postJson('/api/location/update', $this->location(['attendance_id' => $attendance->id + 999]))->assertForbidden();
        $attendance->update(['check_out' => now()]);
        $this->postJson('/api/location/update', $this->location(['attendance_id' => $attendance->id]))->assertConflict();
        $this->getJson('/api/location/tracking-status')->assertOk()->assertJsonPath('active', false);
    }

    public function test_admin_live_feed_returns_only_open_sessions_with_the_latest_location(): void
    {
        [$employee] = $this->employee(); Sanctum::actingAs($employee); $attendance = $this->checkIn();
        LocationLog::create(['employee_id' => $employee->id, 'attendance_id' => $attendance->id, 'latitude' => 28.6140, 'longitude' => 77.2090, 'accuracy' => 8, 'recorded_at' => now()->addSecond()]);
        [$admin] = $this->employee('ADMIN', 'hr_admin'); Sanctum::actingAs($admin);
        $this->getJson('/api/admin/live-employees')->assertOk()->assertJsonCount(1)->assertJsonPath('0.employee_id', $employee->id)->assertJsonPath('0.last_location.latitude', 28.614)->assertJsonPath('0.last_location.accuracy', 8);
        $attendance->update(['check_out' => now()]);
        $this->getJson('/api/admin/live-employees')->assertOk()->assertJsonCount(0);
    }

    public function test_employee_cannot_access_admin_live_feed_or_track_anothers_session(): void
    {
        [$employee] = $this->employee(); Sanctum::actingAs($employee); $attendance = $this->checkIn();
        $this->getJson('/api/admin/live-employees')->assertForbidden();
        [$other] = $this->employee('OTHER');
        $otherAttendance = Attendance::create(['employee_id' => $other->id, 'office_id' => $other->office_id, 'attendance_date' => '2026-01-01', 'check_in' => now()]);
        $this->postJson('/api/location/update', $this->location(['attendance_id' => $otherAttendance->id]))->assertForbidden();
        $this->assertSame($employee->id, $attendance->employee_id);
    }

    private function checkIn(): Attendance
    {
        $this->post('/api/attendance/check-in', array_merge($this->location(), ['photo' => UploadedFile::fake()->image('selfie.jpg', 480, 480)]))->assertCreated();
        return Attendance::firstOrFail();
    }

    private function employee(string $prefix = 'EMP', string $role = 'employee'): array
    {
        $department = Department::firstOrCreate(['name' => 'Engineering']); $office = Office::create(['name' => $prefix.' Office '.uniqid(), 'latitude' => 28.6139, 'longitude' => 77.2090, 'radius' => 200]);
        AttendanceSetting::create(['office_id' => $office->id, 'location_tracking_interval_seconds' => 60]);
        return [Employee::create(['employee_code' => $prefix.'-'.uniqid(), 'name' => $prefix, 'email' => strtolower($prefix).uniqid().'@example.test', 'mobile' => '9'.str_pad((string) random_int(1, 999999999), 9, '0', STR_PAD_LEFT), 'password' => 'password', 'role' => $role, 'department_id' => $department->id, 'office_id' => $office->id]), $office];
    }

    private function location(array $extra = []): array { return array_merge(['latitude' => 28.6139, 'longitude' => 77.2090, 'accuracy' => 10, 'position_timestamp' => now()->valueOf()], $extra); }
}
