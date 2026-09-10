<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\AttendanceSetting;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\LocationLog;
use App\Models\Office;
use App\Models\WfhRequest;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;
use Tests\TestCase;

/**
 * A verification harness, not a production concurrency test suite.  Each test
 * uses a fresh file-backed SQLite database because the normal :memory: test
 * database cannot be shared with worker processes.
 */
class ConcurrencyVerificationTest extends TestCase
{
    private string $database;

    /** @var list<string> */
    private array $temporaryFiles = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->database = sys_get_temp_dir().DIRECTORY_SEPARATOR.'attendance-concurrency-'.bin2hex(random_bytes(8)).'.sqlite';
        touch($this->database);
        $this->temporaryFiles[] = $this->database;

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', $this->database);
        config()->set('whatsapp.enabled', false);
        DB::purge('sqlite');
        DB::reconnect('sqlite');
        Artisan::call('migrate:fresh', ['--database' => 'sqlite', '--force' => true]);
    }

    protected function tearDown(): void
    {
        DB::disconnect('sqlite');
        foreach ($this->temporaryFiles as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }

        parent::tearDown();
    }

    public function test_leave_overlap_parallel_requests_leave_one_safe_request(): void
    {
        [$employee, $token] = $this->employeeWithToken();
        $type = LeaveType::create(['name' => 'Concurrency leave']);
        $payload = [
            'leave_type_id' => $type->id,
            'start_date' => now()->addDays(10)->toDateString(),
            'end_date' => now()->addDays(12)->toDateString(),
        ];

        $responses = $this->concurrently([
            $this->job('POST', '/api/leaves', $token, $payload),
            $this->job('POST', '/api/leaves', $token, $payload),
        ]);

        $count = LeaveRequest::where('employee_id', $employee->id)->count();
        $this->report('leave_overlap', $responses, ['leave_records' => $count]);

        self::assertSame([201, 422], $this->statuses($responses));
        self::assertSame(1, $count);
        $this->assertSafeResponses($responses);
    }

    public function test_leave_review_parallel_approve_and_reject_allow_one_safe_transition(): void
    {
        [, $employeeToken, $office] = $this->employeeWithToken();
        [, $adminToken] = $this->employeeWithToken('hr_admin', $office);
        $type = LeaveType::create(['name' => 'Review leave']);
        $leave = LeaveRequest::create([
            'employee_id' => Employee::where('role', 'employee')->firstOrFail()->id,
            'leave_type_id' => $type->id,
            'start_date' => now()->addDays(10)->toDateString(),
            'end_date' => now()->addDays(10)->toDateString(),
            'status' => 'pending',
        ]);

        $responses = $this->concurrently([
            $this->job('PATCH', '/api/admin/leaves/'.$leave->id, $adminToken, ['status' => 'approved']),
            $this->job('PATCH', '/api/admin/leaves/'.$leave->id, $adminToken, ['status' => 'rejected']),
        ]);

        $leave->refresh();
        $audits = AuditLog::where('resource_type', class_basename(LeaveRequest::class))
            ->where('resource_id', $leave->id)->count();
        $this->report('leave_review', $responses, ['final_status' => $leave->status, 'audit_records' => $audits]);

        self::assertSame([200, 409], $this->statuses($responses));
        self::assertContains($leave->status, ['approved', 'rejected']);
        self::assertSame(1, $audits);
        $this->assertSafeResponses($responses);
    }

    public function test_wfh_review_parallel_approve_and_reject_allow_one_safe_transition(): void
    {
        [$employee, , $office] = $this->employeeWithToken();
        [, $adminToken] = $this->employeeWithToken('hr_admin', $office);
        $wfh = WfhRequest::create([
            'employee_id' => $employee->id,
            'attendance_date' => now()->addDays(10)->toDateString(),
            'status' => 'pending',
        ]);

        $responses = $this->concurrently([
            $this->job('PATCH', '/api/admin/wfh-requests/'.$wfh->id, $adminToken, ['status' => 'approved']),
            $this->job('PATCH', '/api/admin/wfh-requests/'.$wfh->id, $adminToken, ['status' => 'rejected']),
        ]);

        $wfh->refresh();
        $audits = AuditLog::where('resource_type', class_basename(WfhRequest::class))
            ->where('resource_id', $wfh->id)->count();
        $this->report('wfh_review', $responses, ['final_status' => $wfh->status, 'audit_records' => $audits]);

        self::assertSame([200, 409], $this->statuses($responses));
        self::assertContains($wfh->status, ['approved', 'rejected']);
        self::assertSame(1, $audits);
        $this->assertSafeResponses($responses);
    }

    public function test_first_wfh_check_in_parallel_requests_return_existing_duplicate_contract(): void
    {
        [$employee, $token] = $this->employeeWithToken();
        $responses = $this->concurrently([
            $this->job('POST', '/api/attendance/check-in', $token, ['mode' => 'wfh']),
            $this->job('POST', '/api/attendance/check-in', $token, ['mode' => 'wfh']),
        ]);

        $count = Attendance::where('employee_id', $employee->id)->count();
        $rawLeak = collect($responses)->contains(fn (array $response) => str_contains(strtolower((string) ($response['raw'] ?? '')), 'sqlstate'));
        $this->report('first_check_in', $responses, ['attendance_records' => $count, 'raw_sqlstate_in_http_response' => $rawLeak]);

        self::assertSame([201, 422], $this->statuses($responses));
        self::assertSame(1, $count);
        self::assertFalse($rawLeak);
        $this->assertSafeResponses($responses);
    }

    public function test_live_location_interval_parallel_updates_create_one_record(): void
    {
        [$employee, $token, $office] = $this->employeeWithToken();
        $attendance = Attendance::create([
            'employee_id' => $employee->id,
            'office_id' => $office->id,
            'mode' => 'wfh',
            'attendance_date' => now()->toDateString(),
            'check_in' => now(),
            'status' => 'work_from_home',
        ]);
        $payload = [
            'attendance_id' => $attendance->id,
            'latitude' => 28.6139,
            'longitude' => 77.2090,
            'accuracy' => 10,
            'position_timestamp' => now()->valueOf(),
        ];

        $responses = $this->concurrently([
            $this->job('POST', '/api/location/update', $token, $payload),
            $this->job('POST', '/api/location/update', $token, $payload),
        ]);

        $count = LocationLog::where('attendance_id', $attendance->id)->count();
        $this->report('live_location_interval', $responses, ['location_records' => $count]);

        self::assertSame([201, 202], $this->statuses($responses));
        self::assertSame(1, $count);
        $this->assertSafeResponses($responses);
    }

    /** @return array{0: Employee, 1: string, 2: Office} */
    private function employeeWithToken(string $role = 'employee', ?Office $office = null): array
    {
        $office ??= Office::create([
            'name' => 'Concurrency Office '.Employee::count(),
            'address' => 'Test address',
            'latitude' => 28.6139,
            'longitude' => 77.2090,
            'radius' => 1000,
            'status' => 'active',
        ]);
        AttendanceSetting::firstOrCreate(['office_id' => $office->id], [
            'office_start_time' => '09:00',
            'office_end_time' => '18:00',
            'grace_period_minutes' => 0,
            'minimum_working_minutes' => 480,
            'late_after_time' => '09:00',
            'half_day_after_minutes' => 240,
            'overtime_enabled' => false,
            'gps_accuracy_threshold_meters' => 100,
            'location_tracking_interval_seconds' => 60,
            'working_days' => [1, 2, 3, 4, 5, 6, 7],
            'wfh_enabled' => true,
            'wfh_gps_required' => false,
            'wfh_photo_required' => false,
            'wfh_approval_required' => false,
            'wfh_tracking_enabled' => true,
        ]);
        $department = Department::firstOrCreate(['name' => 'Concurrency Department']);
        $number = Employee::withTrashed()->count() + 1;
        $employee = Employee::create([
            'employee_code' => 'CON-'.$number.'-'.strtoupper(substr(bin2hex(random_bytes(3)), 0, 5)),
            'name' => 'Concurrency '.$role.' '.$number,
            'email' => 'concurrency-'.$number.'-'.bin2hex(random_bytes(2)).'@example.test',
            'mobile' => '90000'.str_pad((string) $number, 5, '0', STR_PAD_LEFT),
            'password' => 'password',
            'role' => $role,
            'department_id' => $department->id,
            'office_id' => $office->id,
            'joining_date' => now()->subYear()->toDateString(),
            'status' => 'active',
            'wfh_eligible' => true,
        ]);

        return [$employee, $employee->createToken('concurrency-verification')->plainTextToken, $office];
    }

    /** @return array{method: string, path: string, token: string, payload: array<string, mixed>} */
    private function job(string $method, string $path, string $token, array $payload): array
    {
        return compact('method', 'path', 'token', 'payload');
    }

    /** @param list<array{method: string, path: string, token: string, payload: array<string, mixed>}> $jobs
     *  @return list<array{status?: int, body?: mixed, raw?: string, worker_error?: string}>
     */
    private function concurrently(array $jobs): array
    {
        $startFile = $this->temporary('start');
        $processes = [];
        foreach ($jobs as $index => $job) {
            $readyFile = $this->temporary('ready-'.$index);
            $jobFile = $this->temporary('job-'.$index.'.json');
            file_put_contents($jobFile, json_encode($job, JSON_THROW_ON_ERROR));
            $process = new Process(
                [PHP_BINARY, base_path('tests/Support/ConcurrencyWorker.php')],
                base_path(),
                array_merge($_ENV, [
                    'CONCURRENCY_DATABASE' => $this->database,
                    'CONCURRENCY_READY_FILE' => $readyFile,
                    'CONCURRENCY_START_FILE' => $startFile,
                    'CONCURRENCY_JOB_FILE' => $jobFile,
                ]),
                null,
                30,
            );
            $process->start();
            $processes[] = compact('process', 'readyFile');
        }

        $deadline = microtime(true) + 15;
        while (collect($processes)->contains(fn (array $entry) => ! file_exists($entry['readyFile'])) && microtime(true) < $deadline) {
            usleep(10_000);
        }
        if (collect($processes)->contains(fn (array $entry) => ! file_exists($entry['readyFile']))) {
            foreach ($processes as $entry) {
                $entry['process']->stop();
            }
            self::fail('Both concurrency workers did not reach the start barrier.');
        }
        touch($startFile);

        $responses = [];
        foreach ($processes as $entry) {
            /** @var Process $process */
            $process = $entry['process'];
            $process->wait();
            $output = trim($process->getOutput());
            $decoded = json_decode($output, true);
            $responses[] = is_array($decoded) ? $decoded : [
                'worker_error' => trim($process->getErrorOutput()) ?: 'Worker did not return JSON.',
                'raw' => $output,
            ];
        }

        return $responses;
    }

    private function temporary(string $suffix): string
    {
        $file = sys_get_temp_dir().DIRECTORY_SEPARATOR.'attendance-concurrency-'.bin2hex(random_bytes(8)).'-'.$suffix;
        $this->temporaryFiles[] = $file;

        return $file;
    }

    /** @param list<array<string, mixed>> $responses
     *  @return list<int>
     */
    private function statuses(array $responses): array
    {
        $statuses = array_map(fn (array $response) => $response['status'] ?? 0, $responses);
        sort($statuses);

        return $statuses;
    }

    /** @param list<array<string, mixed>> $responses */
    private function assertSafeResponses(array $responses): void
    {
        foreach ($responses as $response) {
            self::assertArrayNotHasKey('worker_error', $response);
            $raw = strtolower((string) ($response['raw'] ?? ''));
            self::assertStringNotContainsString('sqlstate', $raw);
            self::assertStringNotContainsString('queryexception', $raw);
            self::assertStringNotContainsString('"trace"', $raw);
        }
    }

    /** @param list<array<string, mixed>> $responses */
    private function report(string $test, array $responses, array $databaseOutcome): void
    {
        fwrite(STDERR, 'CONCURRENCY_RESULT '.json_encode([
            'test' => $test,
            'responses' => $responses,
            'database' => $databaseOutcome,
        ], JSON_UNESCAPED_SLASHES).PHP_EOL);
    }
}
