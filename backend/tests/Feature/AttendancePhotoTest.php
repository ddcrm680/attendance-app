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

class AttendancePhotoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void { parent::setUp(); Storage::fake(config('attendance.photo_disk')); }

    public function test_punch_in_requires_a_photo(): void
    {
        $employee = $this->employee(); Sanctum::actingAs($employee);
        $this->postJson('/api/attendance/check-in', $this->location())->assertUnprocessable()->assertJsonPath('message', 'Photo is required to mark attendance.');
    }

    public function test_valid_selfie_is_saved_privately_with_punch_in(): void
    {
        $employee = $this->employee(); Sanctum::actingAs($employee);
        $this->post('/api/attendance/check-in', $this->location(['photo' => $this->photo()]))->assertCreated();
        $attendance = Attendance::first();
        $this->assertNotNull($attendance->check_in_photo_path);
        $this->assertStringStartsWith("attendance/{$employee->id}/", $attendance->check_in_photo_path);
        Storage::disk(config('attendance.photo_disk'))->assertExists($attendance->check_in_photo_path);
        $this->assertArrayNotHasKey('check_in_photo_path', $this->getJson('/api/attendance/today')->json());
    }

    public function test_punch_out_requires_a_photo_and_valid_selfie_completes_it(): void
    {
        $employee = $this->employee(); Sanctum::actingAs($employee);
        $this->post('/api/attendance/check-in', $this->location(['photo' => $this->photo()]))->assertCreated();
        $this->postJson('/api/attendance/check-out', $this->location())->assertUnprocessable()->assertJsonPath('message', 'Please take a selfie to complete your attendance.');
        $this->post('/api/attendance/check-out', $this->location(['photo' => $this->photo()]))->assertOk();
        $this->assertNotNull(Attendance::first()->check_out_photo_path);
    }

    public function test_non_image_malformed_and_oversized_files_are_rejected(): void
    {
        $employee = $this->employee(); Sanctum::actingAs($employee);
        $this->withHeader('Accept', 'application/json')->post('/api/attendance/check-in', $this->location(['photo' => UploadedFile::fake()->create('payload.exe', 10, 'application/x-msdownload')]))->assertUnprocessable();
        $this->withHeader('Accept', 'application/json')->post('/api/attendance/check-in', $this->location(['photo' => UploadedFile::fake()->create('broken.jpg', 10, 'image/jpeg')]))->assertUnprocessable();
        $this->withHeader('Accept', 'application/json')->post('/api/attendance/check-in', $this->location(['photo' => $this->photo()->size(config('attendance.photo_max_kilobytes') + 1)]))->assertUnprocessable();
        $this->assertDatabaseCount('attendance', 0);
    }

    public function test_authorized_owner_can_view_photo_but_other_employee_cannot(): void
    {
        $employee = $this->employee(); Sanctum::actingAs($employee);
        $this->post('/api/attendance/check-in', $this->location(['photo' => $this->photo()]))->assertCreated();
        $attendance = Attendance::first();
        $this->get("/api/attendance/{$attendance->id}/photos/check_in")->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        Sanctum::actingAs($this->employee('OTHER'));
        $this->getJson("/api/attendance/{$attendance->id}/photos/check_in")->assertForbidden();
    }

    public function test_photo_access_requires_authentication_and_admin_is_authorized(): void
    {
        $employee = $this->employee(); Sanctum::actingAs($employee);
        $this->post('/api/attendance/check-in', $this->location(['photo' => $this->photo()])); $attendance = Attendance::first();
        $this->app['auth']->forgetGuards();
        $this->getJson("/api/attendance/{$attendance->id}/photos/check_in")->assertUnauthorized();
        $admin = $this->employee('ADMIN', 'super_admin'); Sanctum::actingAs($admin);
        $this->get("/api/attendance/{$attendance->id}/photos/check_in")->assertOk();
    }

    public function test_employee_cannot_attach_a_photo_to_another_employees_attendance(): void
    {
        $employee = $this->employee(); $other = $this->employee('OTHER'); Sanctum::actingAs($employee);
        $this->post('/api/attendance/check-in', $this->location(['employee_id' => $other->id, 'photo' => $this->photo()]))->assertCreated();
        $this->assertSame($employee->id, Attendance::first()->employee_id);
    }

    private function employee(string $code = 'EMP', string $role = 'employee'): Employee
    {
        $department = Department::firstOrCreate(['name' => 'Engineering']);
        $office = Office::firstOrCreate(['name' => 'Main'], ['latitude' => 28.6139, 'longitude' => 77.2090, 'radius' => 200]);
        AttendanceSetting::firstOrCreate(['office_id' => $office->id]);
        return Employee::create(['employee_code' => $code.'-'.uniqid(), 'name' => $code, 'email' => strtolower($code).uniqid().'@example.test', 'mobile' => '9'.str_pad((string) random_int(1, 999999999), 9, '0', STR_PAD_LEFT), 'password' => 'password', 'role' => $role, 'department_id' => $department->id, 'office_id' => $office->id]);
    }

    private function location(array $extra = []): array { return array_merge(['latitude' => 28.6139, 'longitude' => 77.2090, 'accuracy' => 10], $extra); }
    private function photo(): UploadedFile { return UploadedFile::fake()->image('fresh-selfie.jpg', 480, 480); }
}
