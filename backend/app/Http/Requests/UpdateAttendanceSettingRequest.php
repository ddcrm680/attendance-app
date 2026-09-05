<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAttendanceSettingRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->isAdmin() ?? false; }

    public function rules(): array
    {
        return [
            'office_start_time' => ['sometimes', 'date_format:H:i'],
            'office_end_time' => ['sometimes', 'date_format:H:i'],
            'grace_period_minutes' => ['sometimes', 'integer', 'min:0', 'max:240'],
            'minimum_working_minutes' => ['sometimes', 'integer', 'min:1', 'max:1440'],
            'half_day_after_minutes' => ['sometimes', 'integer', 'min:1', 'max:1440'],
            'overtime_enabled' => ['sometimes', 'boolean'],
            'gps_accuracy_threshold_meters' => ['sometimes', 'integer', 'min:1', 'max:10000'],
            'location_tracking_interval_seconds' => ['sometimes', 'integer', 'min:5', 'max:3600'],
            'working_days' => ['sometimes', 'array', 'min:1'],
            'working_days.*' => ['integer', 'between:1,7'],
            'wfh_enabled' => ['sometimes', 'boolean'],
            'wfh_gps_required' => ['sometimes', 'boolean'],
            'wfh_photo_required' => ['sometimes', 'boolean'],
            'wfh_approval_required' => ['sometimes', 'boolean'],
            'wfh_tracking_enabled' => ['sometimes', 'boolean'],
        ];
    }
}
