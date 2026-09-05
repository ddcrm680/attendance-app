<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Department;
use App\Models\Employee;
use App\Models\LocationLog;
use App\Models\Office;
use App\Services\SensitiveDataRetentionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PrivacyHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void { parent::setUp(); Storage::fake(config('attendance.photo_disk')); }

    public function test_api_responses_include_safe_security_headers(): void
    {
        $this->postJson('/api/login', [])->assertStatus(422)
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    }

    public function test_retention_removes_only_expired_closed_session_data_and_is_repeatable(): void
    {
        config()->set('privacy.photo_retention_days', 30); config()->set('privacy.location_log_retention_days', 30); config()->set('privacy.cleanup_batch_size', 20);
        $employee = $this->employee();
        $old = $this->attendance($employee, now()->subDays(40), true, 'attendance/old.jpg');
        $open = $this->attendance($employee, now()->subDays(40), false, 'attendance/open.jpg', '2026-04-07');
        Storage::disk(config('attendance.photo_disk'))->put('attendance/old.jpg', 'old'); Storage::disk(config('attendance.photo_disk'))->put('attendance/open.jpg', 'open');
        LocationLog::create(['employee_id' => $employee->id, 'attendance_id' => $old->id, 'latitude' => 28.6, 'longitude' => 77.2, 'accuracy' => 10, 'recorded_at' => now()->subDays(40)]);
        LocationLog::create(['employee_id' => $employee->id, 'attendance_id' => $open->id, 'latitude' => 28.6, 'longitude' => 77.2, 'accuracy' => 10, 'recorded_at' => now()->subDays(40)]);

        $result = app(SensitiveDataRetentionService::class)->cleanup();
        $this->assertSame(['photos' => 1, 'location_logs' => 1], $result);
        Storage::disk(config('attendance.photo_disk'))->assertMissing('attendance/old.jpg'); Storage::disk(config('attendance.photo_disk'))->assertExists('attendance/open.jpg');
        $this->assertNull($old->refresh()->check_in_photo_path); $this->assertNotNull($open->refresh()->check_in_photo_path);
        $this->assertSame(['photos' => 0, 'location_logs' => 0], app(SensitiveDataRetentionService::class)->cleanup());
    }

    public function test_tracking_and_private_data_stay_authenticated_and_employee_scoped(): void
    {
        $employee = $this->employee(); $other = $this->employee('OTHER', 'other@example.test', '9000000002');
        $attendance = $this->attendance($employee, now(), false, null);
        $log = LocationLog::create(['employee_id' => $employee->id, 'attendance_id' => $attendance->id, 'latitude' => 28.6, 'longitude' => 77.2, 'accuracy' => 10, 'recorded_at' => now()]);
        $this->getJson('/api/location/history')->assertUnauthorized();
        Sanctum::actingAs($other); $this->getJson('/api/location/history')->assertOk()->assertJsonCount(0);
        $this->assertSame($employee->id, $log->employee_id);
    }

    private function employee(string $code = 'EMP', string $email = 'employee@example.test', string $mobile = '9000000001'): Employee
    {
        $department = Department::firstOrCreate(['name' => 'Engineering']); $office = Office::firstOrCreate(['name' => 'Privacy Office'], ['latitude' => 28.6, 'longitude' => 77.2, 'radius' => 200]);
        return Employee::create(['employee_code' => $code, 'name' => $code, 'email' => $email, 'mobile' => $mobile, 'password' => 'password', 'department_id' => $department->id, 'office_id' => $office->id]);
    }

    private function attendance(Employee $employee, $time, bool $closed, ?string $photo, string $date = '2026-04-06'): Attendance
    {
        return Attendance::create(['employee_id' => $employee->id, 'office_id' => $employee->office_id, 'attendance_date' => $date, 'check_in' => $time, 'check_out' => $closed ? $time : null, 'check_in_photo_path' => $photo, 'status' => 'present']);
    }
}
