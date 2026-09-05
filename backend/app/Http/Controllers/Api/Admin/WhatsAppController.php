<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\WhatsAppMessageLog;
use App\Services\WhatsAppNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use App\Services\AuditService;

class WhatsAppController extends Controller
{
    public function __construct(private AuditService $audit) {}
    public function index(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', 'in:queued,processing,sent,failed'],
            'type' => ['nullable', 'string', 'max:50'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $query = WhatsAppMessageLog::query()->with('attendance.employee:id,name,employee_code')->latest();
        if (! empty($data['status'])) {
            $query->where('status', $data['status']);
        }
        if (! empty($data['type'])) {
            $query->where('notification_type', $data['type']);
        }
        return response()->json($query->paginate($data['per_page'] ?? 25));
    }

    public function settings()
    {
        return response()->json([
            'enabled' => (bool) config('whatsapp.enabled'),
            'provider' => config('whatsapp.provider'),
            'attendance_notifications' => config('whatsapp.notifications'),
            'attendance_recipient_configured' => (bool) config('whatsapp.attendance_recipient'),
            'daily_report_recipient_configured' => (bool) config('whatsapp.daily_report_recipient'),
            'rate_per_minute' => (int) config('whatsapp.rate_per_minute'),
        ]);
    }

    public function daily(Request $request, WhatsAppNotificationService $notifications)
    {
        $data = $request->validate([
            'date' => ['nullable', 'date'],
        ]);
        $log = $notifications->queueDailySummary(isset($data['date']) ? Carbon::parse($data['date']) : now());
        if (! $log) {
            return response()->json([
                'message' => 'Daily WhatsApp reporting is disabled or has no valid recipient.',
            ], 422);
        }

        $this->audit->record($request, 'whatsapp.daily_summary_queued', $log, [
            'date' => (isset($data['date']) ? Carbon::parse($data['date']) : now())->toDateString(),
        ]);
        return response()->json(['message' => 'Daily summary queued.', 'log_id' => $log->id], 202);
    }
}
