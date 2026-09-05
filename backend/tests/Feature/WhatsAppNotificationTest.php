<?php

namespace Tests\Feature;

use App\Jobs\SendWhatsAppMessage;
use App\Models\Attendance;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Office;
use App\Models\WhatsAppMessageLog;
use App\Services\WhatsApp\WhatsAppProvider;
use App\Services\WhatsAppNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

class WhatsAppNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('whatsapp.enabled', true);
        config()->set('whatsapp.attendance_recipient', '+919000000000');
        config()->set('whatsapp.daily_report_recipient', '+919000000000');
    }

    public function test_successful_punch_queues_notification_without_blocking_attendance(): void
    {
        Queue::fake(); $employee = $this->employee(); Sanctum::actingAs($employee);
        $this->postJson('/api/attendance/check-in', $this->location())->assertCreated();
        $this->assertDatabaseHas('whatsapp_message_logs', ['notification_type' => 'punch_in', 'status' => 'queued']);
        Queue::assertPushed(SendWhatsAppMessage::class);
    }

    public function test_duplicate_event_uses_a_single_idempotent_log(): void
    {
        Queue::fake(); $attendance = $this->attendance($this->employee()); $service = app(WhatsAppNotificationService::class);
        $service->queueAttendance($attendance, 'punch_in'); $service->queueAttendance($attendance, 'punch_in');
        $this->assertDatabaseCount('whatsapp_message_logs', 1);
        Queue::assertPushed(SendWhatsAppMessage::class, 1);
    }

    public function test_delivery_is_logged_with_provider_reference(): void
    {
        $attendance = $this->attendance($this->employee());
        $log = WhatsAppMessageLog::create(['attendance_id' => $attendance->id, 'notification_type' => 'punch_in', 'recipient' => '+919000000000', 'provider' => 'fake', 'status' => 'queued', 'idempotency_key' => 'provider-test']);
        $this->app->instance(WhatsAppProvider::class, new class implements WhatsAppProvider { public function send(string $recipient, string $body, ?string $photoPath = null): array { return ['message_id' => 'wamid.test']; } });
        (new SendWhatsAppMessage($log->id))->handle(app(WhatsAppProvider::class), app(WhatsAppNotificationService::class));
        $this->assertDatabaseHas('whatsapp_message_logs', ['id' => $log->id, 'status' => 'sent', 'provider_message_id' => 'wamid.test']);
    }

    public function test_temporary_delivery_failure_does_not_change_attendance(): void
    {
        config()->set('queue.default', 'sync'); $employee = $this->employee(); Sanctum::actingAs($employee);
        $this->app->instance(WhatsAppProvider::class, new class implements WhatsAppProvider { public function send(string $recipient, string $body, ?string $photoPath = null): array { throw new RuntimeException('network timeout'); } });
        $this->postJson('/api/attendance/check-in', $this->location())->assertCreated();
        $this->assertDatabaseHas('attendance', ['employee_id' => $employee->id]);
        $this->assertDatabaseHas('whatsapp_message_logs', ['notification_type' => 'punch_in', 'status' => 'failed']);
    }

    public function test_daily_summary_is_queued_and_admin_routes_are_protected(): void
    {
        Queue::fake(); $employee = $this->employee(); Sanctum::actingAs($employee);
        $this->getJson('/api/admin/whatsapp/logs')->assertForbidden();
        $admin = $this->employee('ADM-001', 'admin@example.test', '9000000009', 'super_admin'); Sanctum::actingAs($admin);
        $this->postJson('/api/admin/whatsapp/daily-summary', ['date' => '2026-04-06'])->assertStatus(202);
        $this->getJson('/api/admin/whatsapp/logs')->assertOk()->assertJsonCount(1, 'data');
        Queue::assertPushed(SendWhatsAppMessage::class);
    }

    private function employee(string $code = 'EMP-001', string $email = 'employee@example.test', string $mobile = '9000000001', string $role = 'employee'): Employee
    {
        $department = Department::firstOrCreate(['name' => 'Engineering']);
        $office = Office::firstOrCreate(['name' => 'Test Office'], ['latitude' => 28.6139, 'longitude' => 77.2090, 'radius' => 200]);
        return Employee::create(['employee_code' => $code, 'name' => 'Test Employee', 'email' => $email, 'mobile' => $mobile, 'password' => 'test-password', 'department_id' => $department->id, 'office_id' => $office->id, 'role' => $role]);
    }

    private function attendance(Employee $employee): Attendance
    {
        return Attendance::create(['employee_id' => $employee->id, 'office_id' => $employee->office_id, 'attendance_date' => '2026-04-06', 'check_in' => Carbon::parse('2026-04-06 09:00:00'), 'status' => 'present']);
    }

    private function location(): array { return ['latitude' => 28.6139, 'longitude' => 77.2090, 'accuracy' => 10, 'photo' => UploadedFile::fake()->image('selfie.jpg', 480, 480)]; }
}
