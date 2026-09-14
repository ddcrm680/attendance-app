<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LeaveManagementIndexRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->isAdmin() ?? false; }
    public function rules(): array
    {
        return ['search' => ['nullable', 'string', 'max:100'], 'leave_type_id' => ['nullable', 'integer', 'exists:leave_types,id'], 'status' => ['nullable', 'in:pending,approved,rejected,cancelled'], 'from' => ['nullable', 'date'], 'to' => ['nullable', 'date', 'after_or_equal:from'], 'per_page' => ['nullable', 'integer', 'min:1', 'max:100']];
    }
}
