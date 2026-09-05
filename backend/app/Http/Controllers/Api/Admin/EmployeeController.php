<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use App\Http\Requests\EmployeeIndexRequest;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Services\AuditService;

class EmployeeController extends Controller
{
    public function __construct(private AuditService $audit) {}
    public function index(EmployeeIndexRequest $request)
    {
        $query = Employee::with(['department', 'office'])->orderBy('name');

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->input('department_id'));
        }
        if ($request->filled('office_id')) {
            $query->where('office_id', $request->input('office_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('employee_code', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return response()->json($query->paginate($request->input('per_page', 25)));
    }

    public function show(Employee $employee)
    {
        $this->authorize('view', $employee);

        return response()->json($employee->load(['department', 'office']));
    }

    public function store(StoreEmployeeRequest $request)
    {
        $this->authorize('create', Employee::class);

        $data = $request->validated();
        $data['password'] = Hash::make($data['password']);

        $employee = Employee::create($data);
        $this->audit->record($request, 'employee.created', $employee, ['role' => $employee->role, 'status' => $employee->status]);

        return response()->json($employee->load(['department', 'office']), 201);
    }

    public function update(UpdateEmployeeRequest $request, Employee $employee)
    {
        $this->authorize('update', $employee);

        $data = $request->validated();
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $changed = array_keys($data);
        $previousRole = $employee->role;
        $employee->update($data);
        $this->audit->record($request, $previousRole !== $employee->role ? 'employee.role_changed' : 'employee.updated', $employee, ['changed_fields' => $changed, 'role' => $employee->role, 'status' => $employee->status]);

        return response()->json($employee->load(['department', 'office']));
    }

    public function destroy(Employee $employee)
    {
        $this->authorize('delete', $employee);

        $this->audit->record(request(), 'employee.deleted', $employee, ['role' => $employee->role]);
        $employee->delete();

        return response()->json(['message' => 'Employee removed']);
    }
}
