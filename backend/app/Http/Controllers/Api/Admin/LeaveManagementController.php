<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Services\AuditService;
use Illuminate\Http\Request;

class LeaveManagementController extends Controller
{
    public function __construct(private AuditService $audit) {}

    public function index()
    {
        return response()->json(
            LeaveRequest::with(['employee:id,name,employee_code', 'leaveType'])
                ->latest()
                ->paginate(50)
        );
    }

    public function review(Request $request, LeaveRequest $leave)
    {
        $data = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
        ]);

        if ($leave->status !== 'pending') {
            return response()->json([
                'message' => 'This leave request has already been reviewed.',
            ], 409);
        }

        $leave->update($data + [
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);
        $this->audit->record($request, 'leave_request.'.$leave->status, $leave, [
            'employee_id' => $leave->employee_id,
        ]);

        return response()->json($leave);
    }

    public function types()
    {
        return response()->json(LeaveType::orderBy('name')->get());
    }

    public function storeType(Request $request)
    {
        $type = LeaveType::create($request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:leave_types,name'],
            'active' => ['sometimes', 'boolean'],
            'reason_required' => ['sometimes', 'boolean'],
        ]));
        $this->audit->record($request, 'leave_type.created', $type, [
            'active' => $type->active,
        ]);

        return response()->json($type, 201);
    }

    public function updateType(Request $request, LeaveType $leaveType)
    {
        $data = $request->validate([
            'name' => [
                'sometimes',
                'string',
                'max:100',
                'unique:leave_types,name,'.$leaveType->id,
            ],
            'active' => ['sometimes', 'boolean'],
            'reason_required' => ['sometimes', 'boolean'],
        ]);
        $leaveType->update($data);
        $this->audit->record($request, 'leave_type.updated', $leaveType, [
            'changed_fields' => array_keys($data),
        ]);

        return response()->json($leaveType);
    }
}
