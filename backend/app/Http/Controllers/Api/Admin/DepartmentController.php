<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDepartmentRequest;
use App\Http\Requests\UpdateDepartmentRequest;
use App\Models\Department;
use Illuminate\Http\Request;
use App\Services\AuditService;

class DepartmentController extends Controller
{
    public function __construct(private AuditService $audit) {}
    public function index(Request $request)
    {
        $this->authorize('viewAny', Department::class);

        $departments = Department::withCount('employees')
            ->when($request->filled('search'), function ($query) use ($request) {
                $query->where('name', 'like', '%'.$request->string('search')->toString().'%');
            })
            ->orderBy('name')
            ->paginate(min((int) $request->input('per_page', 25), 100));

        return response()->json($departments);
    }

    public function show(Department $department)
    {
        $this->authorize('view', $department);

        return response()->json($department->loadCount('employees'));
    }

    public function store(StoreDepartmentRequest $request)
    {
        $department = Department::create($request->validated());
        $this->audit->record($request, 'department.created', $department, ['status' => $department->status]);

        return response()->json($department->loadCount('employees'), 201);
    }

    public function update(UpdateDepartmentRequest $request, Department $department)
    {
        $data = $request->validated();

        if (($data['status'] ?? null) === 'inactive' && $department->employees()->exists()) {
            return response()->json([
                'message' => 'Cannot deactivate a department with employees assigned to it.',
            ], 409);
        }

        $department->update($data);
        $this->audit->record($request, 'department.updated', $department, ['changed_fields' => array_keys($data), 'status' => $department->status]);

        return response()->json($department->loadCount('employees'));
    }

    public function destroy(Department $department)
    {
        $this->authorize('delete', $department);

        if ($department->employees()->exists()) {
            return response()->json([
                'message' => 'Cannot delete a department with employees assigned to it.',
            ], 409);
        }

        $this->audit->record(request(), 'department.deleted', $department, ['status' => $department->status]);
        $department->delete();

        return response()->json(['message' => 'Department removed']);
    }
}
