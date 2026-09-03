<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\LocationLog;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Validator;

class LocationController extends Controller
{
    public function update(Request $request)
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

        $attendance = Attendance::where('employee_id', $employee->id)
            ->where('attendance_date', Carbon::today()->toDateString())
            ->whereNotNull('check_in')
            ->whereNull('check_out')
            ->first();

        if (! $attendance) {
            return response()->json(['message' => 'No active check-in session. Location tracking only runs between check-in and check-out.'], 409);
        }

        $log = LocationLog::create([
            'employee_id' => $employee->id,
            'attendance_id' => $attendance->id,
            'latitude' => $request->input('latitude'),
            'longitude' => $request->input('longitude'),
            'accuracy' => $request->input('accuracy'),
            'recorded_at' => Carbon::now(),
        ]);

        return response()->json($log, 201);
    }

    public function current(Request $request)
    {
        $log = LocationLog::where('employee_id', $request->user()->id)
            ->orderByDesc('recorded_at')
            ->first();

        return response()->json($log);
    }

    public function history(Request $request)
    {
        $logs = LocationLog::where('employee_id', $request->user()->id)
            ->when($request->filled('attendance_id'), fn ($q) => $q->where('attendance_id', $request->input('attendance_id')))
            ->orderBy('recorded_at')
            ->limit(500)
            ->get();

        return response()->json($logs);
    }
}
