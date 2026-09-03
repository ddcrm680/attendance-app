<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceSetting;
use App\Services\GeofenceService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Validator;

class AttendanceController extends Controller
{
    public function __construct(private GeofenceService $geofence) {}

    public function checkIn(Request $request)
    {
        $employee = $request->user();

        $validator = Validator::make($request->all(), [
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'accuracy' => ['nullable', 'numeric', 'min:0'],
            'device' => ['nullable', 'string', 'max:255'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $today = Carbon::today()->toDateString();

        $existing = Attendance::where('employee_id', $employee->id)
            ->where('attendance_date', $today)
            ->first();

        if ($existing && $existing->check_in) {
            return response()->json(['message' => 'You have already checked in today.'], 409);
        }

        $office = $employee->office;

        if (! $office) {
            return response()->json(['message' => 'No office is assigned to your profile. Contact HR.'], 422);
        }

        $lat = (float) $request->input('latitude');
        $lng = (float) $request->input('longitude');
        $accuracy = $request->input('accuracy');

        $settings = AttendanceSetting::where('office_id', $office->id)->first()
            ?? AttendanceSetting::whereNull('office_id')->first();

        $accuracyThreshold = $settings->gps_accuracy_threshold_meters ?? 100;

        if ($accuracy !== null && $accuracy > $accuracyThreshold) {
            return response()->json([
                'message' => 'Unable to verify your location. Please enable GPS and try again.',
            ], 422);
        }

        $geofenceResult = $this->geofence->isWithinOffice($office, $lat, $lng);

        if (! $geofenceResult['inside']) {
            return response()->json([
                'message' => 'You are outside the allowed location.',
                'distance_meters' => $geofenceResult['distance_meters'],
                'allowed_radius_meters' => $office->radius,
            ], 422);
        }

        $now = Carbon::now();
        $lateMinutes = 0;

        if ($settings) {
            $lateAfter = Carbon::parse($today . ' ' . $settings->late_after_time);
            if ($now->greaterThan($lateAfter)) {
                $lateMinutes = $now->diffInMinutes($lateAfter);
            }
        }

        $attendance = Attendance::updateOrCreate(
            ['employee_id' => $employee->id, 'attendance_date' => $today],
            [
                'office_id' => $office->id,
                'check_in' => $now,
                'check_in_latitude' => $lat,
                'check_in_longitude' => $lng,
                'check_in_accuracy' => $accuracy,
                'check_in_distance_meters' => $geofenceResult['distance_meters'],
                'status' => $lateMinutes > 0 ? 'late' : 'present',
                'late_minutes' => $lateMinutes,
            ]
        );

        return response()->json([
            'message' => 'Attendance marked successfully',
            'attendance' => $attendance,
        ], 201);
    }

    public function checkOut(Request $request)
    {
        $employee = $request->user();

        $validator = Validator::make($request->all(), [
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'accuracy' => ['nullable', 'numeric', 'min:0'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $today = Carbon::today()->toDateString();

        $attendance = Attendance::where('employee_id', $employee->id)
            ->where('attendance_date', $today)
            ->first();

        if (! $attendance || ! $attendance->check_in) {
            return response()->json(['message' => 'You have not checked in today.'], 409);
        }

        if ($attendance->check_out) {
            return response()->json(['message' => 'You have already checked out today.'], 409);
        }

        $lat = (float) $request->input('latitude');
        $lng = (float) $request->input('longitude');

        $distance = null;
        if ($attendance->office) {
            $result = $this->geofence->isWithinOffice($attendance->office, $lat, $lng);
            $distance = $result['distance_meters'];
        }

        $now = Carbon::now();
        $workingMinutes = $attendance->check_in->diffInMinutes($now);

        $settings = AttendanceSetting::where('office_id', $attendance->office_id)->first()
            ?? AttendanceSetting::whereNull('office_id')->first();

        $overtimeMinutes = 0;
        $status = $attendance->status;

        if ($settings) {
            if ($settings->overtime_enabled && $workingMinutes > $settings->minimum_working_minutes) {
                $overtimeMinutes = $workingMinutes - $settings->minimum_working_minutes;
            }
            if ($workingMinutes < $settings->half_day_after_minutes) {
                $status = 'half_day';
            }
        }

        $attendance->update([
            'check_out' => $now,
            'check_out_latitude' => $lat,
            'check_out_longitude' => $lng,
            'check_out_accuracy' => $request->input('accuracy'),
            'check_out_distance_meters' => $distance,
            'working_minutes' => $workingMinutes,
            'overtime_minutes' => $overtimeMinutes,
            'status' => $status,
        ]);

        return response()->json([
            'message' => 'Attendance completed',
            'attendance' => $attendance,
        ]);
    }

    public function today(Request $request)
    {
        $attendance = Attendance::where('employee_id', $request->user()->id)
            ->whereDate('attendance_date', Carbon::today()->toDateString())
            ->first();

        return response()->json($attendance);
    }

    public function history(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $query = Attendance::where('employee_id', $request->user()->id)
            ->orderByDesc('attendance_date');

        if ($request->filled('from')) {
            $query->where('attendance_date', '>=', $request->input('from'));
        }
        if ($request->filled('to')) {
            $query->where('attendance_date', '<=', $request->input('to'));
        }

        return response()->json($query->paginate($request->input('per_page', 30)));
    }


    public function checkInTest(Request $request)
    {
        $employee = $request->user();

        $validator = Validator::make($request->all(), [
            'latitude' => ['required', 'numeric'],
            'longitude' => ['required', 'numeric'],
            'accuracy' => ['nullable', 'numeric', 'min:0'],
            'device' => ['nullable', 'string', 'max:255'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $today = Carbon::today()->toDateString();

        $office = $employee->office;

        if (! $office) {
            return response()->json([
                'message' => 'No office is assigned to your profile. Contact HR.',
            ], 422);
        }

        $lat = (float) $request->input('latitude');
        $lng = (float) $request->input('longitude');
        $accuracy = $request->input('accuracy');

        $settings = AttendanceSetting::where('office_id', $office->id)->first()
            ?? AttendanceSetting::whereNull('office_id')->first();

        $now = Carbon::now();
        $lateMinutes = 0;

        if ($settings) {
            $lateAfter = Carbon::parse(
                $today . ' ' . $settings->late_after_time
            );

            if ($now->greaterThan($lateAfter)) {
                $lateMinutes = $now->diffInMinutes($lateAfter);
            }
        }

        $attendance = Attendance::updateOrCreate(
            [
                'employee_id' => $employee->id,
                'attendance_date' => $today,
            ],
            [
                'office_id' => $office->id,
                'check_in' => $now,
                'check_in_latitude' => $lat,
                'check_in_longitude' => $lng,
                'check_in_accuracy' => $accuracy,
                'check_in_distance_meters' => 0,
                'status' => $lateMinutes > 0 ? 'late' : 'present',
                'late_minutes' => $lateMinutes,
            ]
        );

        return response()->json([
            'message' => 'TEST attendance marked successfully',
            'attendance' => $attendance,
        ], 201);
    }


    public function checkOutTest(Request $request)
    {
        $employee = $request->user();

        $validator = Validator::make($request->all(), [
            'latitude' => ['required', 'numeric'],
            'longitude' => ['required', 'numeric'],
            'accuracy' => ['nullable', 'numeric', 'min:0'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $today = Carbon::today()->toDateString();

        $attendance = Attendance::where('employee_id', $employee->id)
            ->whereDate('attendance_date', $today)
            ->first();

        if (! $attendance || ! $attendance->check_in) {
            return response()->json([
                'message' => 'You have not checked in today.',
            ], 409);
        }

        if ($attendance->check_out) {
            return response()->json([
                'message' => 'You have already checked out today.',
            ], 409);
        }

        $lat = (float) $request->input('latitude');
        $lng = (float) $request->input('longitude');
        $accuracy = $request->input('accuracy');

        $now = Carbon::now();
        $workingMinutes = $attendance->check_in->diffInMinutes($now);

        $settings = AttendanceSetting::where(
            'office_id',
            $attendance->office_id
        )->first()
            ?? AttendanceSetting::whereNull('office_id')->first();

        $overtimeMinutes = 0;
        $status = $attendance->status;

        if ($settings) {
            if (
                $settings->overtime_enabled &&
                $workingMinutes > $settings->minimum_working_minutes
            ) {
                $overtimeMinutes =
                    $workingMinutes - $settings->minimum_working_minutes;
            }

            if ($workingMinutes < $settings->half_day_after_minutes) {
                $status = 'half_day';
            }
        }

        $attendance->update([
            'check_out' => $now,
            'check_out_latitude' => $lat,
            'check_out_longitude' => $lng,
            'check_out_accuracy' => $accuracy,
            'check_out_distance_meters' => 0,
            'working_minutes' => $workingMinutes,
            'overtime_minutes' => $overtimeMinutes,
            'status' => $status,
        ]);

        return response()->json([
            'message' => 'TEST attendance completed',
            'attendance' => $attendance,
        ]);
    }


}
