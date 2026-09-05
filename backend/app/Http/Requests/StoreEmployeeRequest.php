<?php

namespace App\Http\Requests;

use App\Models\Employee;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user || ! $user->can('create', Employee::class)) {
            return false;
        }

        return ! $user->isHrAdmin() || $this->input('role') === 'employee';
    }

    public function rules(): array
    {
        return [
            'employee_code' => ['required', 'string', 'max:50', 'unique:employees,employee_code'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:employees,email'],
            'mobile' => ['required', 'string', 'unique:employees,mobile'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'in:super_admin,hr_admin,employee'],
            'department_id' => ['nullable', Rule::exists('departments', 'id')->where('status', 'active')],
            'designation' => ['nullable', 'string', 'max:255'],
            'office_id' => ['nullable', Rule::exists('offices', 'id')->where('status', 'active')],
            'joining_date' => ['nullable', 'date'],
            'status' => ['sometimes', 'in:active,inactive,suspended'],
        ];
    }
}
