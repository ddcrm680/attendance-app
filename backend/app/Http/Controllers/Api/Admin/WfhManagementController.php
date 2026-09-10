<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Exceptions\ConcurrentWriteException;
use App\Models\Employee;
use App\Models\WfhRequest;
use App\Services\AtomicWriteService;
use App\Services\AuditService;
use Illuminate\Http\Request;

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

    public function index()
    {
        return response()->json(
            WfhRequest::with('employee:id,name,employee_code')
                ->latest('attendance_date')
                ->paginate(50)
        );
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
