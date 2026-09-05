<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\AttendanceSetting;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Office;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AttendanceEngineTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void { Carbon::setTestNow(); parent::tearDown(); }

    public function test_valid_punch_in_uses_server_time_and_leaves_checkout_open(): void
    {
        [$employee] = $this->employeeWithRules();
        Carbon::setTestNow(Carbon::parse('2026-04-06 09:35:00', config('app.timezone')));
        Sanctum::actingAs($employee);
        $this->postJson('/api/attendance/check-in', $this->location() + ['check_in' => '1999-01-01 00:00:00', 'status' => 'absent'])->assertCreated()->assertJsonPath('attendance.status', 'present');
        $this->assertDatabaseHas('attendance', ['employee_id' => $employee->id, 'attendance_date' => '2026-04-06', 'working_minutes' => 0]);
        $this->assertSame('2026-04-06 09:35:00', Attendance::first()->check_in->format('Y-m-d H:i:s'));
        $this->assertNull(Attendance::first()->check_out);
    }

    public function test_duplicate_punch_in_and_punch_out_without_punch_in_are_rejected(): void
    {
        [$employee] = $this->employeeWithRules(); Sanctum::actingAs($employee);
        $this->postJson('/api/attendance/check-out', $this->location())->assertConflict();
        $this->postJson('/api/attendance/check-in', $this->location())->assertCreated();
        $this->postJson('/api/attendance/check-in', $this->location())->assertUnprocessable();
    }

    public function test_duplicate_punch_out_is_rejected(): void
    {
        [$employee] = $this->employeeWithRules(); Sanctum::actingAs($employee);
        $this->postJson('/api/attendance/check-in', $this->location())->assertCreated();
        Carbon::setTestNow(now()->addHours(8));
        $this->postJson('/api/attendance/check-out', $this->location())->assertOk();
        $this->postJson('/api/attendance/check-out', $this->location())->assertConflict();
    }

    public function test_grace_period_and_late_minutes_are_calculated_from_office_start_time(): void
    {
        [$employee] = $this->employeeWithRules(['office_start_time' => '09:00', 'grace_period_minutes' => 15]); Sanctum::actingAs($employee);
        Carbon::setTestNow(Carbon::parse('2026-04-06 09:15:00', config('app.timezone')));
        $this->postJson('/api/attendance/check-in', $this->location())->assertCreated()->assertJsonPath('attendance.late_minutes', 0);
        Attendance::query()->delete();
        Carbon::setTestNow(Carbon::parse('2026-04-07 09:22:00', config('app.timezone')));
        $this->postJson('/api/attendance/check-in', $this->location())->assertCreated()->assertJsonPath('attendance.status', 'late')->assertJsonPath('attendance.late_minutes', 7);
    }

    public function test_checkout_calculates_early_departure_overtime_and_full_day_status(): void
    {
        [$employee] = $this->employeeWithRules(['office_start_time' => '09:00', 'office_end_time' => '18:00', 'minimum_working_minutes' => 480]); Sanctum::actingAs($employee);
        Carbon::setTestNow(Carbon::parse('2026-04-06 09:00:00', config('app.timezone'))); $this->postJson('/api/attendance/check-in', $this->location());
        Carbon::setTestNow(Carbon::parse('2026-04-06 18:30:00', config('app.timezone')));
        $this->postJson('/api/attendance/check-out', $this->location())->assertOk()->assertJsonPath('attendance.working_minutes', 570)->assertJsonPath('attendance.overtime_minutes', 90)->assertJsonPath('attendance.early_departure_minutes', 0)->assertJsonPath('attendance.status', 'present');
    }

    public function test_short_day_is_half_day_and_records_early_departure(): void
    {
        [$employee] = $this->employeeWithRules(['office_start_time' => '09:00', 'office_end_time' => '18:00', 'minimum_working_minutes' => 480, 'half_day_after_minutes' => 240]); Sanctum::actingAs($employee);
        Carbon::setTestNow(Carbon::parse('2026-04-06 09:00:00', config('app.timezone'))); $this->postJson('/api/attendance/check-in', $this->location());
        Carbon::setTestNow(Carbon::parse('2026-04-06 13:00:00', config('app.timezone')));
        $this->postJson('/api/attendance/check-out', $this->location())->assertOk()->assertJsonPath('attendance.status', 'half_day')->assertJsonPath('attendance.working_minutes', 240)->assertJsonPath('attendance.early_departure_minutes', 300);
    }

    public function test_work_below_minimum_but_above_half_day_threshold_is_partial(): void
    {
        [$employee] = $this->employeeWithRules(['office_start_time' => '09:00', 'office_end_time' => '18:00', 'minimum_working_minutes' => 480, 'half_day_after_minutes' => 240]); Sanctum::actingAs($employee);
        Carbon::setTestNow(Carbon::parse('2026-04-06 09:00:00', config('app.timezone'))); $this->postJson('/api/attendance/check-in', $this->location());
        Carbon::setTestNow(Carbon::parse('2026-04-06 15:00:00', config('app.timezone')));
        $this->postJson('/api/attendance/check-out', $this->location())->assertOk()->assertJsonPath('attendance.status', 'partial')->assertJsonPath('attendance.working_minutes', 360);
    }

    public function test_overnight_shift_keeps_a_single_prior_business_date_record(): void
    {
        [$employee] = $this->employeeWithRules(['office_start_time' => '22:00', 'office_end_time' => '06:00', 'minimum_working_minutes' => 420]); Sanctum::actingAs($employee);
        Carbon::setTestNow(Carbon::parse('2026-04-06 22:00:00', config('app.timezone'))); $this->postJson('/api/attendance/check-in', $this->location())->assertCreated();
        Carbon::setTestNow(Carbon::parse('2026-04-07 06:30:00', config('app.timezone')));
        $this->postJson('/api/attendance/check-out', $this->location())->assertOk()->assertJsonPath('attendance.working_minutes', 510);
        $this->assertDatabaseHas('attendance', ['employee_id' => $employee->id, 'attendance_date' => '2026-04-06']);
    }

    public function test_admin_can_configure_existing_office_attendance_rules(): void
    {
        [$employee, $office] = $this->employeeWithRules();
        $admin = Employee::create(['employee_code' => 'ADMIN-001', 'name' => 'Admin', 'email' => 'admin-rules@example.test', 'mobile' => '9000000002', 'password' => 'password', 'role' => 'super_admin']);
        Sanctum::actingAs($admin);
        $this->putJson("/api/admin/offices/{$office->id}/attendance-settings", ['office_start_time' => '08:30', 'office_end_time' => '17:00', 'grace_period_minutes' => 10, 'minimum_working_minutes' => 450])->assertOk()->assertJsonPath('office_start_time', '08:30');
        $this->assertDatabaseHas('attendance_settings', ['office_id' => $office->id, 'minimum_working_minutes' => 450]);
    }

    private function employeeWithRules(array $rules = []): array
    {
        $department = Department::create(['name' => 'Engineering']);
        $office = Office::create(['name' => 'Main', 'latitude' => 28.6139, 'longitude' => 77.2090, 'radius' => 200]);
        AttendanceSetting::create(array_merge(['office_id' => $office->id], $rules));
        return [Employee::create(['employee_code' => 'E-'.uniqid(), 'name' => 'Employee', 'email' => uniqid().'@example.test', 'mobile' => '9000000001', 'password' => 'password', 'department_id' => $department->id, 'office_id' => $office->id]), $office];
    }

    private function location(): array { return ['latitude' => 28.6139, 'longitude' => 77.2090, 'accuracy' => 10, 'photo' => UploadedFile::fake()->image('selfie.jpg', 480, 480)]; }
}
