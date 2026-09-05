<?php

namespace App\Http\Requests;

use App\Models\Employee;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $target = $this->route('employee');

        if (! $user || ! $target instanceof Employee || ! $user->can('update', $target)) {
            return false;
        }

        return ! ($user->isHrAdmin() && $this->filled('role') && $this->input('role') !== 'employee');
    }

    public function rules(): array
    {
        $employee = $this->route('employee');

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'unique:employees,email,'.$employee->id],
            'mobile' => ['sometimes', 'string', 'unique:employees,mobile,'.$employee->id],
            'role' => ['sometimes', 'in:super_admin,hr_admin,employee'],
            'department_id' => ['nullable', Rule::exists('departments', 'id')->where('status', 'active')],
            'designation' => ['nullable', 'string', 'max:255'],
            'office_id' => ['nullable', Rule::exists('offices', 'id')->where('status', 'active')],
            'status' => ['sometimes', 'in:active,inactive,suspended'],
            'password' => ['sometimes', 'string', 'min:8'],
        ];
    }
}
