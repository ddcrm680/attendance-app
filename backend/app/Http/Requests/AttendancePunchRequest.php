<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rules\File;

class AttendancePunchRequest extends LocationUpdateRequest
{
    public function rules(): array
    {
        $locationRules = parent::rules();
        if ($this->input('mode', 'office') === 'wfh') {
            $locationRules['latitude'] = ['nullable', 'numeric', 'between:-90,90'];
            $locationRules['longitude'] = ['nullable', 'numeric', 'between:-180,180'];
            $locationRules['accuracy'] = ['nullable', 'numeric', 'min:0', 'max:10000'];
        }
        return array_merge($locationRules, [
            'mode' => ['required', 'in:office,wfh'],
            // A client timestamp/status is deliberately not accepted. The server clock is authoritative.
            'device' => ['nullable', 'string', 'max:255'],
            'photo' => [
                'nullable',
                'file',
                File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(config('attendance.photo_max_kilobytes')),
                'dimensions:min_width=160,min_height=160,max_width=6000,max_height=6000',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! in_array(strtolower($value->getClientOriginalExtension()), ['jpg', 'jpeg', 'png', 'webp'], true)) {
                        $fail('The photo file extension is not supported.');
                    }
                },
            ],
        ]);
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'mode' => $this->input('mode', 'office'),
        ]);
    }

    public function messages(): array
    {
        return ['photo.required' => $this->isMethod('post') && str_ends_with($this->path(), 'check-out')
            ? 'Please take a selfie to complete your attendance.'
            : 'Photo is required to mark attendance.'];
    }

    protected function failedValidation(Validator $validator): void
    {
        if ($validator->errors()->has('photo') && ! $this->hasFile('photo')) {
            $message = $this->messages()['photo.required'];
            throw new HttpResponseException(response()->json(['message' => $message, 'errors' => $validator->errors()], 422));
        }
        parent::failedValidation($validator);
    }
}
