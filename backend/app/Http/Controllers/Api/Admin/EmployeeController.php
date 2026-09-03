<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class EmployeeController extends Controller
{
    public function index(Request $request)
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

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employee_code' => ['required', 'string', 'max:50', 'unique:employees,employee_code'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:employees,email'],
            'mobile' => ['required', 'string', 'unique:employees,mobile'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'in:super_admin,hr_admin,employee'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'designation' => ['nullable', 'string', 'max:255'],
            'office_id' => ['nullable', 'exists:offices,id'],
            'joining_date' => ['nullable', 'date'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['password'] = Hash::make($data['password']);

        $employee = Employee::create($data);

        return response()->json($employee->load(['department', 'office']), 201);
    }

    public function update(Request $request, Employee $employee)
    {
        $validator = Validator::make($request->all(), [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'unique:employees,email,' . $employee->id],
            'mobile' => ['sometimes', 'string', 'unique:employees,mobile,' . $employee->id],
            'role' => ['sometimes', 'in:super_admin,hr_admin,employee'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'designation' => ['nullable', 'string', 'max:255'],
            'office_id' => ['nullable', 'exists:offices,id'],
            'status' => ['sometimes', 'in:active,inactive,suspended'],
            'password' => ['sometimes', 'string', 'min:8'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $employee->update($data);

        return response()->json($employee->load(['department', 'office']));
    }

    public function destroy(Employee $employee)
    {
        $employee->delete();

        return response()->json(['message' => 'Employee removed']);
    }
}
