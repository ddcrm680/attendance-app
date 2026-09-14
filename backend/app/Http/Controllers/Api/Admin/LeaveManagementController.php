<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Exceptions\ConcurrentWriteException;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Services\AtomicWriteService;
use App\Services\AuditService;
use Illuminate\Http\Request;
use App\Http\Requests\LeaveManagementIndexRequest;

class LeaveManagementController extends Controller
{
    public function __construct(private AuditService $audit, private AtomicWriteService $writes) {}

    public function index(LeaveManagementIndexRequest $request)
    {
        $leaves = LeaveRequest::with(['employee:id,name,employee_code', 'leaveType'])
            ->when($request->filled('search'), fn ($query) => $query->whereHas('employee', fn ($employee) => $employee->where(function ($q) use ($request) { $search = $request->string('search')->toString(); $q->where('name', 'like', "%{$search}%")->orWhere('employee_code', 'like', "%{$search}%"); })))
            ->when($request->filled('leave_type_id'), fn ($query) => $query->where('leave_type_id', $request->input('leave_type_id')))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->input('status')))
            ->when($request->filled('from'), fn ($query) => $query->whereDate('end_date', '>=', $request->input('from')))
            ->when($request->filled('to'), fn ($query) => $query->whereDate('start_date', '<=', $request->input('to')))
            ->latest()->paginate($request->input('per_page', 25))->withQueryString();
        return response()->json($leaves);
    }

    public function review(Request $request, LeaveRequest $leave)
    {
        $data = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
        ]);

        try {
            $reviewed = $this->writes->run(function () use ($leave, $data, $request) {
                $updated = LeaveRequest::whereKey($leave->id)
                    ->where('status', 'pending')
                    ->update($data + [
                        'reviewed_by' => $request->user()->id,
                        'reviewed_at' => now(),
                    ]);

                if (! $updated) {
                    return null;
                }

                $reviewed = LeaveRequest::findOrFail($leave->id);
                $this->audit->record($request, 'leave_request.'.$reviewed->status, $reviewed, [
                    'employee_id' => $reviewed->employee_id,
                ]);

                return $reviewed;
            });
        } catch (ConcurrentWriteException) {
            $reviewed = null;
        }

        if (! $reviewed) {
            return response()->json([
                'message' => 'This leave request has already been reviewed.',
            ], 409);
        }

        return response()->json($reviewed);
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
