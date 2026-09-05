<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Holiday;
use App\Services\AttendanceCalendarService;
use Illuminate\Http\Request;

class CalendarController extends Controller
{
    public function overview(Request $request, AttendanceCalendarService $calendar)
    {
        $date = now();

        return response()->json([
            'date' => $date->toDateString(),
            'status' => $calendar->status($request->user(), $date),
            'holidays' => Holiday::where('active', true)
                ->whereDate('holiday_date', '>=', $date->toDateString())
                ->orderBy('holiday_date')
                ->limit(50)
                ->get(),
        ]);
    }
}
