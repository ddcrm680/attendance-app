<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Exceptions\ConcurrentWriteException;
use App\Models\Employee;
use App\Models\WfhRequest;
use App\Services\AtomicWriteService;
use App\Services\AuditService;
use Illuminate\Http\Request;
use App\Http\Requests\WfhManagementIndexRequest;

class WfhManagementController extends Controller
{
    public function __construct(private AuditService $audit, private AtomicWriteService $writes) {}

    public function eligibility(Request $request, Employee $employee)
    {
        $data = $request->validate([
            'wfh_eligible' => ['required', 'boolean'],
        ]);

        $employee->update($data);
        $this->audit->record($request, 'employee.wfh_eligibility_changed', $employee, [
            'wfh_eligible' => (bool) $employee->wfh_eligible,
        ]);

        return response()->json($employee);
    }

    public function index(WfhManagementIndexRequest $request)
    {
        $requests = WfhRequest::with('employee:id,name,employee_code')
            ->when($request->filled('search'), fn ($query) => $query->whereHas('employee', fn ($employee) => $employee->where(function ($q) use ($request) { $search = $request->string('search')->toString(); $q->where('name', 'like', "%{$search}%")->orWhere('employee_code', 'like', "%{$search}%"); })))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->input('status')))
            ->when($request->filled('from'), fn ($query) => $query->whereDate('attendance_date', '>=', $request->input('from')))
            ->when($request->filled('to'), fn ($query) => $query->whereDate('attendance_date', '<=', $request->input('to')))
            ->latest('attendance_date')->paginate($request->input('per_page', 25))->withQueryString();
        return response()->json($requests);
    }

    public function review(Request $request, WfhRequest $wfh)
    {
        $data = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
        ]);

        try {
            $reviewed = $this->writes->run(function () use ($wfh, $data, $request) {
                $updated = WfhRequest::whereKey($wfh->id)
                    ->where('status', 'pending')
                    ->update($data + [
                        'reviewed_by' => $request->user()->id,
                        'reviewed_at' => now(),
                    ]);

                if (! $updated) {
                    return null;
                }

                $reviewed = WfhRequest::findOrFail($wfh->id);
                $this->audit->record(
                    $request,
                    'wfh_request.'.$reviewed->status,
                    $reviewed,
                    ['employee_id' => $reviewed->employee_id]
                );

                return $reviewed;
            });
        } catch (ConcurrentWriteException) {
            $reviewed = null;
        }

        if (! $reviewed) {
            return response()->json([
                'message' => 'This WFH request has already been reviewed.',
            ], 409);
        }

        return response()->json($reviewed);
    }
}
