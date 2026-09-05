<?php

namespace App\Http\Requests;

use App\Models\Department;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $department = $this->route('department');

        return $department instanceof Department
            && ($this->user()?->can('update', $department) ?? false);
    }

    public function rules(): array
    {
        $department = $this->route('department');

        return [
            'name' => ['sometimes', 'string', 'max:255', Rule::unique('departments', 'name')->ignore($department->id)],
            'status' => ['sometimes', 'in:active,inactive'],
        ];
    }
}
