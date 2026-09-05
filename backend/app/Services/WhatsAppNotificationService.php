<?php

namespace App\Services;

use App\Jobs\SendWhatsAppMessage;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\WhatsAppMessageLog;
use Illuminate\Support\Carbon;
use Throwable;

class WhatsAppNotificationService
{
    public function queueAttendance(Attendance $attendance, string $type): ?WhatsAppMessageLog
    {
        if (! config('whatsapp.enabled') || ! config("whatsapp.notifications.{$type}") || ! $recipient = $this->recipient('attendance_recipient')) return null;

        return $this->queue($type, $recipient, "attendance:{$attendance->id}:{$type}", $attendance, []);
    }

    public function queueDailySummary(Carbon $date, ?string $recipient = null): ?WhatsAppMessageLog
    {
        if (! config('whatsapp.enabled') || ! ($recipient ?? $this->recipient('daily_report_recipient'))) return null;
        $recipient ??= $this->recipient('daily_report_recipient');
        return $this->queue('daily_summary', $recipient, "daily-summary:{$date->toDateString()}:{$recipient}", null, ['date' => $date->toDateString()]);
    }

    public function bodyFor(WhatsAppMessageLog $log): string
    {
        if ($log->notification_type === 'daily_summary') return $this->dailySummary(Carbon::parse($log->payload['date']));

        $attendance = $log->attendance()->with('employee:id,name,employee_code')->firstOrFail();
        $label = match ($log->notification_type) { 'punch_in' => 'Punch in', 'punch_out' => 'Punch out', 'late' => 'Late attendance', default => 'Attendance update' };
        $time = $log->notification_type === 'punch_out' ? $attendance->check_out : $attendance->check_in;
        $extra = $log->notification_type === 'late' ? " ({$attendance->late_minutes} minutes late)" : '';
        return "{$label}: {$attendance->employee->name} ({$attendance->employee->employee_code}) on {$attendance->attendance_date->toDateString()} at ".optional($time)->timezone(config('app.timezone'))->format('H:i').$extra.'.';
    }

    private function queue(string $type, string $recipient, string $key, ?Attendance $attendance, array $payload): WhatsAppMessageLog
    {
        $log = WhatsAppMessageLog::firstOrCreate(['idempotency_key' => $key], [
            'attendance_id' => $attendance?->id, 'notification_type' => $type, 'recipient' => $recipient,
            'provider' => (string) config('whatsapp.provider'), 'status' => 'queued', 'payload' => $payload,
        ]);
        if ($log->wasRecentlyCreated) {
            try {
                SendWhatsAppMessage::dispatch($log->id);
            } catch (Throwable $exception) {
                // A synchronous local queue must never turn a valid attendance action into a failed response.
                $log->update(['status' => 'failed', 'failed_at' => now(), 'error_message' => 'Delivery could not be queued.']);
            }
        }
        return $log;
    }

    private function recipient(string $setting): ?string
    {
        $recipient = config("whatsapp.{$setting}");
        return is_string($recipient) && preg_match('/^\+?[1-9]\d{7,14}$/', $recipient) ? $recipient : null;
    }

    private function dailySummary(Carbon $date): string
    {
        $day = $date->toDateString();
        $total = Employee::where('status', 'active')->count();
        $records = Attendance::where('attendance_date', $day)->get(['status', 'check_in', 'check_out', 'working_minutes']);
        $present = $records->whereIn('status', ['present', 'late', 'half_day', 'partial', 'work_from_home'])->count();
        $leave = LeaveRequest::where('status', 'approved')->whereDate('start_date', '<=', $day)->whereDate('end_date', '>=', $day)->count();
        $late = $records->where('status', 'late')->count();
        $working = $records->whereNotNull('check_in')->whereNull('check_out')->count();
        $average = (int) round($records->where('working_minutes', '>', 0)->avg('working_minutes') ?? 0);
        $hours = sprintf('%dh %02dm', intdiv($average, 60), $average % 60);
        return "Daily attendance summary — {$day}\nTotal employees: {$total}\nPresent: {$present}\nAbsent: ".max($total - $present - $leave, 0)."\nOn leave: {$leave}\nLate: {$late}\nCurrently working: {$working}\nAverage working hours: {$hours}";
    }
}
