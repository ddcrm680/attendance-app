<?php

namespace App\Services;

use App\Jobs\SendWhatsAppMessage;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\WhatsAppMessageLog;
use App\Services\WhatsApp\WhatsAppTemplate;
use Illuminate\Support\Carbon;
use Throwable;

class WhatsAppNotificationService
{
    /**
     * Only templates verified as Active in Meta may be delivered as templates.
     * Pending templates continue through the existing plain-text path.
     */
    private const ACTIVE_TEMPLATE_NAMES = ['attendance_punch_in'];

    public function queueAttendance(Attendance $attendance, string $type): ?WhatsAppMessageLog
    {
        if (
            ! config('whatsapp.enabled')
            || ! config("whatsapp.notifications.{$type}")
            || ! $recipient = $this->recipient('attendance_recipient')
        ) {
            return null;
        }

        return $this->queue($type, $recipient, "attendance:{$attendance->id}:{$type}", $attendance, []);
    }

    public function queueDailySummary(Carbon $date, ?string $recipient = null): ?WhatsAppMessageLog
    {
        if (! config('whatsapp.enabled') || ! ($recipient ?? $this->recipient('daily_report_recipient'))) {
            return null;
        }
        $recipient ??= $this->recipient('daily_report_recipient');

        return $this->queue(
            'daily_summary',
            $recipient,
            "daily-summary:{$date->toDateString()}:{$recipient}",
            null,
            ['date' => $date->toDateString()]
        );
    }

    public function bodyFor(WhatsAppMessageLog $log): string
    {
        if ($log->notification_type === 'daily_summary') {
            return $this->dailySummary(Carbon::parse($log->payload['date']));
        }

        $attendance = $log->attendance()->with('employee:id,name,employee_code')->firstOrFail();
        $label = match ($log->notification_type) {
            'punch_in' => 'Punch in',
            'punch_out' => 'Punch out',
            'late' => 'Late attendance',
            default => 'Attendance update',
        };
        $time = $log->notification_type === 'punch_out' ? $attendance->check_out : $attendance->check_in;
        $extra = $log->notification_type === 'late'
            ? " ({$attendance->late_minutes} minutes late)"
            : '';
        $formattedTime = optional($time)
            ->timezone(config('app.timezone'))
            ->format('H:i');

        return "{$label}: {$attendance->employee->name} "
            ."({$attendance->employee->employee_code}) on "
            ."{$attendance->attendance_date->toDateString()} at "
            .$formattedTime.$extra.'.';
    }

    public function templateFor(WhatsAppMessageLog $log): ?WhatsAppTemplate
    {
        if ($log->notification_type === 'daily_summary') {
            $summary = $this->dailySummaryData(Carbon::parse($log->payload['date']));

            return new WhatsAppTemplate('attendance_daily_summary', 'en_US', [
                'attendance_date' => $summary['date'],
                'total_employees' => $summary['total'],
                'present_count' => $summary['present'],
                'absent_count' => $summary['absent'],
                'on_leave_count' => $summary['leave'],
                'late_count' => $summary['late'],
                'currently_working_count' => $summary['working'],
                'average_working_hours' => $summary['average_working_hours'],
            ]);
        }

        $attendance = $log->attendance()->with('employee:id,name,employee_code')->firstOrFail();
        $parameters = [
            'employee_name' => $attendance->employee->name,
            'employee_code' => $attendance->employee->employee_code,
            'attendance_date' => $attendance->attendance_date->toDateString(),
            'late_minutes' => (string) (int) $attendance->late_minutes,
        ];

        return match ($log->notification_type) {
            'punch_in' => new WhatsAppTemplate('attendance_punch_in', 'en_US', [
                'employee_name' => $parameters['employee_name'],
                'check_in_time' => $attendance->check_in->timezone(config('app.timezone'))->format('H:i'),
                'attendance_date' => $parameters['attendance_date'],
            ]),
            'punch_out' => new WhatsAppTemplate('attendance_punch_out', 'en_US', [
                'employee_name' => $parameters['employee_name'],
                'employee_code' => $parameters['employee_code'],
                'check_out_time' => $attendance->check_out->timezone(config('app.timezone'))->format('H:i'),
                'attendance_date' => $parameters['attendance_date'],
            ]),
            'late' => new WhatsAppTemplate('attendance_late', 'en_US', [
                'employee_name' => $parameters['employee_name'],
                'employee_code' => $parameters['employee_code'],
                'check_in_time' => $attendance->check_in->timezone(config('app.timezone'))->format('H:i'),
                'attendance_date' => $parameters['attendance_date'],
                'late_minutes' => $parameters['late_minutes'],
            ]),
            default => null,
        };
    }

    public function activeTemplateFor(WhatsAppMessageLog $log): ?WhatsAppTemplate
    {
        $template = $this->templateFor($log);

        return $template && in_array($template->name, self::ACTIVE_TEMPLATE_NAMES, true)
            ? $template
            : null;
    }

    private function queue(string $type, string $recipient, string $key, ?Attendance $attendance, array $payload): WhatsAppMessageLog
    {
        $log = WhatsAppMessageLog::firstOrCreate(
            ['idempotency_key' => $key],
            [
                'attendance_id' => $attendance?->id,
                'notification_type' => $type,
                'recipient' => $recipient,
                'provider' => (string) config('whatsapp.provider'),
                'status' => 'queued',
                'payload' => $payload,
            ]
        );
        if ($log->wasRecentlyCreated) {
            try {
                SendWhatsAppMessage::dispatch($log->id);
            } catch (Throwable $exception) {
                // A synchronous local queue must never turn a valid attendance action into a failed response.
                $log->update([
                    'status' => 'failed',
                    'failed_at' => now(),
                    'error_message' => 'Delivery could not be queued.',
                ]);
            }
        }
        return $log;
    }

    private function recipient(string $setting): ?string
    {
        $recipient = config("whatsapp.{$setting}");
        return is_string($recipient)
            && preg_match('/^\+?[1-9]\d{7,14}$/', $recipient)
                ? $recipient
                : null;
    }

    private function dailySummary(Carbon $date): string
    {
        $summary = $this->dailySummaryData($date);

        return "Daily attendance summary — {$summary['date']}\n"
            ."Total employees: {$summary['total']}\n"
            ."Present: {$summary['present']}\n"
            ."Absent: {$summary['absent']}\n"
            ."On leave: {$summary['leave']}\n"
            ."Late: {$summary['late']}\n"
            ."Currently working: {$summary['working']}\n"
            ."Average working hours: {$summary['average_working_hours']}";
    }

    /** @return array{date:string,total:int,present:int,absent:int,leave:int,late:int,working:int,average_working_hours:string} */
    private function dailySummaryData(Carbon $date): array
    {
        $day = $date->toDateString();
        $total = Employee::where('status', 'active')->count();
        $records = Attendance::where('attendance_date', $day)->get(['status', 'check_in', 'check_out', 'working_minutes']);
        $present = $records
            ->whereIn('status', ['present', 'late', 'half_day', 'partial', 'work_from_home'])
            ->count();
        $leave = LeaveRequest::where('status', 'approved')
            ->whereDate('start_date', '<=', $day)
            ->whereDate('end_date', '>=', $day)
            ->count();
        $late = $records->where('status', 'late')->count();
        $working = $records->whereNotNull('check_in')->whereNull('check_out')->count();
        $average = (int) round($records->where('working_minutes', '>', 0)->avg('working_minutes') ?? 0);
        $hours = sprintf('%dh %02dm', intdiv($average, 60), $average % 60);

        return [
            'date' => $day,
            'total' => $total,
            'present' => $present,
            'absent' => max($total - $present - $leave, 0),
            'leave' => $leave,
            'late' => $late,
            'working' => $working,
            'average_working_hours' => $hours,
        ];
    }
}
