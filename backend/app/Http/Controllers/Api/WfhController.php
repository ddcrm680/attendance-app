<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WfhRequest;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;

class WfhController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            WfhRequest::where('employee_id', $request->user()->id)
                ->latest('attendance_date')
                ->paginate(30)
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'attendance_date' => ['required', 'date', 'after_or_equal:today'],
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        if (! $request->user()->wfh_eligible) {
            return response()->json([
                'message' => 'Work from home is not available for your account.',
            ], 403);
        }

        $existing = WfhRequest::where('employee_id', $request->user()->id)
            ->where('attendance_date', $data['attendance_date'])
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'A work-from-home request already exists for this date.',
            ], 409);
        }

        try {
            return response()->json(
                WfhRequest::create($data + ['employee_id' => $request->user()->id]),
                201
            );
        } catch (QueryException $exception) {
            if ($this->isDuplicateDateConstraint($exception)) {
                return response()->json([
                    'message' => 'A WFH request already exists for this date.',
                ], 409);
            }

            throw $exception;
        }
    }

    private function isDuplicateDateConstraint(QueryException $exception): bool
    {
        $message = strtolower($exception->getMessage());

        return str_contains($message, 'unique constraint failed: wfh_requests.employee_id, wfh_requests.attendance_date')
            || str_contains($message, 'wfh_requests_employee_id_attendance_date_unique');
    }
}
