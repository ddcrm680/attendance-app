<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LocationUpdateRequest;
use App\Models\Attendance;
use App\Models\LocationLog;
use Illuminate\Http\Request;
use App\Services\VerifiedLocationService;
use App\Services\AttendanceSettingsResolver;

class LocationController extends Controller
{
    public function __construct(private VerifiedLocationService $locations, private AttendanceSettingsResolver $settings) {}

    public function update(LocationUpdateRequest $request)
    {
        $this->authorize('viewAny', LocationLog::class);

        $employee = $request->user();

        $attendance = Attendance::where('employee_id', $employee->id)
            ->whereNotNull('check_in')
            ->whereNull('check_out')
            ->orderByDesc('attendance_date')
            ->first();

        if (! $attendance) {
            return response()->json(['message' => 'No active check-in session. Location tracking only runs between check-in and check-out.'], 409);
        }
        if ($attendance->mode === 'wfh' && ! $this->settings->forOffice($attendance->office)?->wfh_tracking_enabled) {
            return response()->json(['message' => 'Live tracking is disabled for this work-from-home session.'], 403);
        }

        $data = $request->validated();
        if (isset($data['attendance_id']) && (int) $data['attendance_id'] !== $attendance->id) {
            return response()->json(['message' => 'The location update does not belong to your active attendance session.'], 403);
        }

        if (! $attendance->office) {
            return response()->json(['message' => 'The attendance office is no longer available. Contact HR.'], 422);
        }
        $interval = $this->trackingInterval($attendance);
        $lastLog = LocationLog::where('attendance_id', $attendance->id)->orderByDesc('recorded_at')->orderByDesc('id')->first();
        if ($lastLog && $lastLog->recorded_at->greaterThan(now()->subSeconds($interval))) {
            return response()->json(['message' => 'Location update is already current.', 'tracking_interval_seconds' => $interval], 202);
        }
        $location = $this->locations->verify($attendance->office, $data);
        $log = LocationLog::create([
            'employee_id' => $employee->id,
            'attendance_id' => $attendance->id,
            'latitude' => $location['latitude'],
            'longitude' => $location['longitude'],
            'accuracy' => $location['accuracy'],
            'recorded_at' => now(),
        ]);

        return response()->json(['location' => $log, 'tracking_interval_seconds' => $interval], 201);
    }

    public function current(Request $request)
    {
        $this->authorize('viewAny', LocationLog::class);

        $log = LocationLog::where('employee_id', $request->user()->id)
            ->orderByDesc('recorded_at')
            ->first();

        return response()->json($log);
    }

    public function history(Request $request)
    {
        $this->authorize('viewAny', LocationLog::class);

        $data = $request->validate(['attendance_id' => ['nullable', 'integer']]);
        $logs = LocationLog::where('employee_id', $request->user()->id)
            ->when(isset($data['attendance_id']), fn ($q) => $q->where('attendance_id', $data['attendance_id']))
            ->orderBy('recorded_at')
            ->limit(500)
            ->get();

        return response()->json($logs);
    }

    public function trackingStatus(Request $request)
    {
        $this->authorize('viewAny', LocationLog::class);
        $attendance = Attendance::where('employee_id', $request->user()->id)->whereNotNull('check_in')->whereNull('check_out')->orderByDesc('attendance_date')->first();
        $active = $attendance && ! ($attendance->mode === 'wfh' && ! $this->settings->forOffice($attendance->office)?->wfh_tracking_enabled);
        return response()->json(['active' => (bool) $active, 'attendance_id' => $active ? $attendance->id : null, 'tracking_interval_seconds' => $active ? $this->trackingInterval($attendance) : null]);
    }

    private function trackingInterval(Attendance $attendance): int
    {
        return max(30, min(300, $this->settings->forOffice($attendance->office)?->location_tracking_interval_seconds ?? 60));
    }
}
