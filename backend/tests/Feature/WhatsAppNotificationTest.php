<?php

namespace Tests\Feature;

use App\Jobs\SendWhatsAppMessage;
use App\Models\Attendance;
use App\Models\AttendanceSetting;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Office;
use App\Models\WhatsAppMessageLog;
use App\Services\WhatsApp\WhatsAppProvider;
use App\Services\WhatsApp\CloudApiWhatsAppProvider;
use App\Services\WhatsApp\WhatsAppPermanentException;
use App\Services\WhatsApp\WhatsAppTemplate;
use App\Services\WhatsAppNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

class WhatsAppNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_graph_api_version_defaults_to_the_supported_phase_a_version(): void
    {
        $this->assertSame('v25.0', config('whatsapp.graph_api_version'));
    }

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

    public function test_late_wfh_check_in_keeps_wfh_status_and_queues_late_notification(): void
    {
        Queue::fake();
        $employee = $this->employee();
        $employee->update(['wfh_eligible' => true]);
        AttendanceSetting::create([
            'office_id' => $employee->office_id,
            'office_start_time' => '09:00:00',
            'grace_period_minutes' => 15,
            'wfh_enabled' => true,
            'wfh_gps_required' => false,
            'wfh_photo_required' => false,
            'wfh_approval_required' => false,
            'wfh_tracking_enabled' => false,
        ]);
        Carbon::setTestNow(Carbon::parse('2026-04-06 10:00:00', config('app.timezone')));
        Sanctum::actingAs($employee);

        try {
            $this->postJson('/api/attendance/check-in', ['mode' => 'wfh'])
                ->assertCreated()
                ->assertJsonPath('attendance.status', 'work_from_home');

            $attendance = Attendance::firstOrFail();
            $this->assertSame('work_from_home', $attendance->status);
            $this->assertGreaterThan(0, $attendance->late_minutes);
            $this->assertDatabaseHas('whatsapp_message_logs', [
                'attendance_id' => $attendance->id,
                'notification_type' => 'punch_in',
                'status' => 'queued',
            ]);
            $this->assertDatabaseHas('whatsapp_message_logs', [
                'attendance_id' => $attendance->id,
                'notification_type' => 'late',
                'status' => 'queued',
            ]);
        } finally {
            Carbon::setTestNow();
        }
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
        $this->app->instance(WhatsAppProvider::class, new class implements WhatsAppProvider { public function send(string $recipient, string $body, ?string $photoPath = null, ?WhatsAppTemplate $template = null): array { return ['message_id' => 'wamid.test']; } });
        (new SendWhatsAppMessage($log->id))->handle(app(WhatsAppProvider::class), app(WhatsAppNotificationService::class));
        $this->assertDatabaseHas('whatsapp_message_logs', ['id' => $log->id, 'status' => 'sent', 'provider_message_id' => 'wamid.test']);
    }

    public function test_punch_in_selects_the_approved_template_with_exact_parameters(): void
    {
        $attendance = $this->attendance($this->employee());
        $log = WhatsAppMessageLog::create([
            'attendance_id' => $attendance->id,
            'notification_type' => 'punch_in',
            'recipient' => '+919000000000',
            'provider' => 'cloud',
            'status' => 'queued',
            'idempotency_key' => 'punch-in-template-test',
        ]);

        $template = app(WhatsAppNotificationService::class)->templateFor($log);

        $this->assertSame('attendance_punch_in', $template?->name);
        $this->assertSame('en_US', $template?->languageCode);
        $this->assertSame([
            'employee_name' => 'Test Employee',
            'check_in_time' => '09:00',
            'attendance_date' => '2026-04-06',
        ], $template?->bodyParameters);
        $this->assertSame([], $template?->headerParameters);
        $this->assertSame([], $template?->buttonParameters);
        $this->assertSame('attendance_punch_in', app(WhatsAppNotificationService::class)->activeTemplateFor($log)?->name);
    }

    public function test_punch_out_template_candidate_has_exact_named_parameters(): void
    {
        $attendance = $this->attendance($this->employee());
        $attendance->update(['check_out' => Carbon::parse('2026-04-06 18:12:00')]);
        $log = WhatsAppMessageLog::create([
            'attendance_id' => $attendance->id,
            'notification_type' => 'punch_out',
            'recipient' => '+919000000000',
            'provider' => 'cloud',
            'status' => 'queued',
            'idempotency_key' => 'punch-out-template-test',
        ]);

        $template = app(WhatsAppNotificationService::class)->templateFor($log);

        $this->assertSame('attendance_punch_out', $template?->name);
        $this->assertSame('en_US', $template?->languageCode);
        $this->assertSame([
            'employee_name' => 'Test Employee',
            'employee_code' => 'EMP-001',
            'check_out_time' => '18:12',
            'attendance_date' => '2026-04-06',
        ], $template?->bodyParameters);
        $this->assertSame([], $template?->headerParameters);
        $this->assertSame([], $template?->buttonParameters);
        $this->assertSame('attendance_punch_out', app(WhatsAppNotificationService::class)->activeTemplateFor($log)?->name);
    }

    public function test_late_template_candidate_formats_late_minutes_as_integer_text(): void
    {
        $attendance = $this->attendance($this->employee());
        $attendance->update(['status' => 'late', 'late_minutes' => 37]);
        $log = WhatsAppMessageLog::create([
            'attendance_id' => $attendance->id,
            'notification_type' => 'late',
            'recipient' => '+919000000000',
            'provider' => 'cloud',
            'status' => 'queued',
            'idempotency_key' => 'late-template-test',
        ]);

        $template = app(WhatsAppNotificationService::class)->templateFor($log);

        $this->assertSame('attendance_late', $template?->name);
        $this->assertSame('en_US', $template?->languageCode);
        $this->assertSame([
            'employee_name' => 'Test Employee',
            'employee_code' => 'EMP-001',
            'check_in_time' => '09:00',
            'attendance_date' => '2026-04-06',
            'late_minutes' => '37',
        ], $template?->bodyParameters);
        $this->assertSame([], $template?->headerParameters);
        $this->assertSame([], $template?->buttonParameters);
        $this->assertSame('attendance_late', app(WhatsAppNotificationService::class)->activeTemplateFor($log)?->name);
    }

    public function test_daily_summary_template_candidate_uses_existing_human_readable_average(): void
    {
        $attendance = $this->attendance($this->employee());
        $attendance->update([
            'check_out' => Carbon::parse('2026-04-06 17:24:00'),
            'working_minutes' => 504,
        ]);
        $log = WhatsAppMessageLog::create([
            'notification_type' => 'daily_summary',
            'recipient' => '+919000000000',
            'provider' => 'cloud',
            'status' => 'queued',
            'idempotency_key' => 'daily-summary-template-test',
            'payload' => ['date' => '2026-04-06'],
        ]);

        $template = app(WhatsAppNotificationService::class)->templateFor($log);

        $this->assertSame('attendance_daily_summary_v2', $template?->name);
        $this->assertNotSame('attendance_daily_summary', $template?->name);
        $this->assertSame('en_US', $template?->languageCode);
        $this->assertSame([
            'attendance_date' => '2026-04-06',
            'total_employees' => 1,
            'present_count' => 1,
            'absent_count' => 0,
            'on_leave_count' => 0,
            'late_count' => 0,
            'working_count' => 0,
            'avg_working_hours' => '8h 24m',
        ], $template?->bodyParameters);
        $this->assertSame([], $template?->headerParameters);
        $this->assertSame([], $template?->buttonParameters);
        $this->assertSame('attendance_daily_summary_v2', app(WhatsAppNotificationService::class)->activeTemplateFor($log)?->name);
        $this->assertNotSame('attendance_daily_summary', app(WhatsAppNotificationService::class)->activeTemplateFor($log)?->name);
    }

    public function test_cloud_provider_builds_the_active_daily_summary_v2_template_payload(): void
    {
        config()->set('whatsapp.base_url', 'https://graph.facebook.com');
        config()->set('whatsapp.graph_api_version', 'v99.0');
        config()->set('whatsapp.phone_number_id', 'phone-123');
        config()->set('whatsapp.access_token', 'test-token');
        Http::fake(['*' => Http::response(['messages' => [['id' => 'wamid.daily-summary-v2']]], 200)]);

        $attendance = $this->attendance($this->employee());
        $attendance->update([
            'check_out' => Carbon::parse('2026-04-06 17:24:00'),
            'working_minutes' => 504,
        ]);
        $log = WhatsAppMessageLog::create([
            'notification_type' => 'daily_summary',
            'recipient' => '+919000000000',
            'provider' => 'cloud',
            'status' => 'queued',
            'idempotency_key' => 'daily-summary-v2-provider-template-test',
            'payload' => ['date' => '2026-04-06'],
        ]);

        app(CloudApiWhatsAppProvider::class)->send(
            '+919000000000',
            '',
            null,
            app(WhatsAppNotificationService::class)->activeTemplateFor($log),
        );

        Http::assertSent(function ($request): bool {
            $payload = $request->data();

            return $payload['type'] === 'template'
                && $payload['template']['name'] === 'attendance_daily_summary_v2'
                && $payload['template']['language']['code'] === 'en_US'
                && $payload['template']['components'] === [[
                    'type' => 'body',
                    'parameters' => [
                        ['type' => 'text', 'text' => '2026-04-06', 'parameter_name' => 'attendance_date'],
                        ['type' => 'text', 'text' => '1', 'parameter_name' => 'total_employees'],
                        ['type' => 'text', 'text' => '1', 'parameter_name' => 'present_count'],
                        ['type' => 'text', 'text' => '0', 'parameter_name' => 'absent_count'],
                        ['type' => 'text', 'text' => '0', 'parameter_name' => 'on_leave_count'],
                        ['type' => 'text', 'text' => '0', 'parameter_name' => 'late_count'],
                        ['type' => 'text', 'text' => '0', 'parameter_name' => 'working_count'],
                        ['type' => 'text', 'text' => '8h 24m', 'parameter_name' => 'avg_working_hours'],
                    ],
                ]];
        });
    }

    public function test_active_attendance_jobs_use_templates_without_photos(): void
    {
        $attendance = $this->attendance($this->employee());
        $attendance->update([
            'check_in_photo_path' => 'attendance/check-in.jpg',
            'check_out' => Carbon::parse('2026-04-06 18:00:00'),
        ]);
        config()->set('whatsapp.attach_attendance_photo', true);
        $punchIn = WhatsAppMessageLog::create([
            'attendance_id' => $attendance->id,
            'notification_type' => 'punch_in',
            'recipient' => '+919000000000',
            'provider' => 'cloud',
            'status' => 'queued',
            'idempotency_key' => 'punch-in-job-template-test',
        ]);
        $punchOut = WhatsAppMessageLog::create([
            'attendance_id' => $attendance->id,
            'notification_type' => 'punch_out',
            'recipient' => '+919000000000',
            'provider' => 'cloud',
            'status' => 'queued',
            'idempotency_key' => 'punch-out-job-template-test',
        ]);
        $capture = (object) ['calls' => []];
        $provider = new class($capture) implements WhatsAppProvider {
            public function __construct(private object $capture) {}
            public function send(string $recipient, string $body, ?string $photoPath = null, ?WhatsAppTemplate $template = null): array
            {
                $this->capture->calls[] = compact('recipient', 'body', 'photoPath', 'template');
                return ['message_id' => 'wamid.template'];
            }
        };

        (new SendWhatsAppMessage($punchIn->id))->handle($provider, app(WhatsAppNotificationService::class));
        (new SendWhatsAppMessage($punchOut->id))->handle($provider, app(WhatsAppNotificationService::class));

        $this->assertSame('attendance_punch_in', $capture->calls[0]['template']->name);
        $this->assertNull($capture->calls[0]['photoPath']);
        $this->assertSame('attendance_punch_out', $capture->calls[1]['template']->name);
        $this->assertNull($capture->calls[1]['photoPath']);
    }

    public function test_temporary_delivery_failure_does_not_change_attendance(): void
    {
        config()->set('queue.default', 'sync'); $employee = $this->employee(); Sanctum::actingAs($employee);
        $this->app->instance(WhatsAppProvider::class, new class implements WhatsAppProvider { public function send(string $recipient, string $body, ?string $photoPath = null, ?WhatsAppTemplate $template = null): array { throw new RuntimeException('network timeout'); } });
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

    public function test_cloud_provider_uses_configured_graph_api_version_for_text_messages(): void
    {
        config()->set('whatsapp.base_url', 'https://graph.facebook.com');
        config()->set('whatsapp.graph_api_version', 'v99.0');
        config()->set('whatsapp.phone_number_id', 'phone-123');
        config()->set('whatsapp.access_token', 'test-token');
        Http::fake(['*' => Http::response(['messages' => [['id' => 'wamid.version']]], 200)]);

        app(CloudApiWhatsAppProvider::class)->send('+919000000000', 'hello');

        Http::assertSent(fn ($request) => $request->url() === 'https://graph.facebook.com/v99.0/phone-123/messages'
            && $request->hasHeader('Authorization', 'Bearer test-token')
            && $request['type'] === 'text');
    }

    public function test_cloud_provider_builds_the_approved_punch_in_template_payload(): void
    {
        config()->set('whatsapp.base_url', 'https://graph.facebook.com');
        config()->set('whatsapp.graph_api_version', 'v99.0');
        config()->set('whatsapp.phone_number_id', 'phone-123');
        config()->set('whatsapp.access_token', 'test-token');
        Http::fake(['*' => Http::response(['messages' => [['id' => 'wamid.template']]], 200)]);

        $attendance = $this->attendance($this->employee());
        $log = WhatsAppMessageLog::create(['attendance_id' => $attendance->id, 'notification_type' => 'punch_in', 'recipient' => '+919000000000', 'provider' => 'cloud', 'status' => 'queued', 'idempotency_key' => 'provider-template-test']);
        $template = app(WhatsAppNotificationService::class)->templateFor($log);

        app(CloudApiWhatsAppProvider::class)->send('+919000000000', '', null, $template);

        Http::assertSent(function ($request): bool {
            $payload = $request->data();
            return $payload['type'] === 'template'
                && $payload['template']['name'] === 'attendance_punch_in'
                && $payload['template']['language']['code'] === 'en_US'
                && count($payload['template']['components']) === 1
                && $payload['template']['components'][0]['type'] === 'body'
                && $payload['template']['components'][0]['parameters'] === [
                    ['type' => 'text', 'text' => 'Test Employee', 'parameter_name' => 'employee_name'],
                    ['type' => 'text', 'text' => '09:00', 'parameter_name' => 'check_in_time'],
                    ['type' => 'text', 'text' => '2026-04-06', 'parameter_name' => 'attendance_date'],
                ];
        });
    }

    public function test_cloud_provider_keeps_positional_template_parameters_unnamed(): void
    {
        config()->set('whatsapp.base_url', 'https://graph.facebook.com');
        config()->set('whatsapp.graph_api_version', 'v99.0');
        config()->set('whatsapp.phone_number_id', 'phone-123');
        config()->set('whatsapp.access_token', 'test-token');
        Http::fake(['*' => Http::response(['messages' => [['id' => 'wamid.positional']]], 200)]);

        app(CloudApiWhatsAppProvider::class)->send(
            '+919000000000',
            '',
            null,
            new WhatsAppTemplate('attendance_update', 'en_US', ['Alice', 'Today']),
        );

        Http::assertSent(fn ($request) => $request->data()['template']['components'][0]['parameters'] === [
            ['type' => 'text', 'text' => 'Alice'],
            ['type' => 'text', 'text' => 'Today'],
        ]);
    }

    public function test_cloud_provider_supplies_mime_type_for_private_photo_upload(): void
    {
        config()->set('whatsapp.base_url', 'https://graph.facebook.com');
        config()->set('whatsapp.graph_api_version', 'v99.0');
        config()->set('whatsapp.phone_number_id', 'phone-123');
        config()->set('whatsapp.access_token', 'test-token');
        $disk = \Mockery::mock();
        $disk->shouldReceive('exists')->with('attendance/photo.jpg')->andReturnTrue();
        $disk->shouldReceive('get')->with('attendance/photo.jpg')->andReturn('private-photo');
        $disk->shouldReceive('mimeType')->with('attendance/photo.jpg')->andReturn('image/jpeg');
        Storage::shouldReceive('disk')->with('local')->andReturn($disk);
        Http::fake([
            '*/media' => Http::response(['id' => 'media-123'], 200),
            '*' => Http::response(['messages' => [['id' => 'wamid.photo']]], 200),
        ]);

        app(CloudApiWhatsAppProvider::class)->send('+919000000000', 'photo', 'attendance/photo.jpg');

        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/media')
            && $request->isMultipart()
            && str_contains($request->body(), 'image/jpeg'));
    }

    public function test_cloud_provider_keeps_rate_limits_retryable_and_other_client_errors_permanent(): void
    {
        config()->set('whatsapp.base_url', 'https://graph.facebook.com');
        config()->set('whatsapp.graph_api_version', 'v99.0');
        config()->set('whatsapp.phone_number_id', 'phone-123');
        config()->set('whatsapp.access_token', 'test-token');

        Http::fakeSequence()
            ->push([], 429)
            ->push([], 400);
        try {
            app(CloudApiWhatsAppProvider::class)->send('+919000000000', 'hello');
            $this->fail('Expected a retryable provider exception.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('temporarily unavailable', $exception->getMessage());
        }

        $this->expectException(WhatsAppPermanentException::class);
        app(CloudApiWhatsAppProvider::class)->send('+919000000000', 'hello');
    }

    public function test_meta_client_error_diagnostics_are_sanitized_and_persisted(): void
    {
        config()->set('queue.default', 'sync');
        config()->set('whatsapp.phone_number_id', 'phone-123');
        config()->set('whatsapp.access_token', 'test-token');
        Http::fake(['*' => Http::response([
            'error' => [
                'code' => 132001,
                'message' => 'Template rejected: Bearer super-secret-token',
                'error_data' => ['details' => 'access_token=another-secret-token'],
            ],
        ], 400)]);
        $employee = $this->employee();
        Sanctum::actingAs($employee);

        $this->postJson('/api/attendance/check-in', $this->location())->assertCreated();

        $error = (string) WhatsAppMessageLog::firstOrFail()->error_message;
        $this->assertStringContainsString('HTTP 400', $error);
        $this->assertStringContainsString('Meta code 132001', $error);
        $this->assertStringContainsString('Meta message Template rejected: Bearer [redacted]', $error);
        $this->assertStringContainsString('Details access_token [redacted]', $error);
        $this->assertStringNotContainsString('super-secret-token', $error);
        $this->assertStringNotContainsString('another-secret-token', $error);
    }

    public function test_provider_error_text_is_sanitized_before_it_is_stored(): void
    {
        $attendance = $this->attendance($this->employee());
        $log = WhatsAppMessageLog::create([
            'attendance_id' => $attendance->id,
            'notification_type' => 'punch_in',
            'recipient' => '+919000000000',
            'provider' => 'fake',
            'status' => 'queued',
            'idempotency_key' => 'redaction-test',
        ]);
        $this->app->instance(WhatsAppProvider::class, new class implements WhatsAppProvider {
            public function send(string $recipient, string $body, ?string $photoPath = null, ?WhatsAppTemplate $template = null): array
            {
                throw new RuntimeException('Bearer super-secret-token');
            }
        });

        try {
            (new SendWhatsAppMessage($log->id))->handle(app(WhatsAppProvider::class), app(WhatsAppNotificationService::class));
        } catch (RuntimeException) {
            // The queue will retry transient exceptions; inspect the persisted safe error below.
        }

        $this->assertDatabaseMissing('whatsapp_message_logs', ['id' => $log->id, 'error_message' => 'Bearer super-secret-token']);
        $this->assertStringNotContainsString('super-secret-token', (string) $log->fresh()->error_message);
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
