<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LocationUpdateRequest extends FormRequest
{
    public function authorize(): bool { return $this->user() !== null; }

    public function rules(): array
    {
        return [
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'accuracy' => ['required', 'numeric', 'min:0', 'max:10000'],
            // Browser GeolocationPosition.timestamp in Unix milliseconds; never used as attendance time.
            'position_timestamp' => ['nullable', 'integer', 'min:0'],
            // Ignored for identity; when supplied it must match the caller's open session.
            'attendance_id' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
