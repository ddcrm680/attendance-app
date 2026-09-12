<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateAttendanceSettingRequest;
use App\Models\AttendanceSetting;
use App\Models\Office;
use App\Services\AuditService;

class AttendanceSettingController extends Controller
{
    public function __construct(private AuditService $audit) {}
    public function show(Office $office)
    {
        $this->authorize('view', $office);

        return $this->responseFor($office->attendanceSetting ?? AttendanceSetting::whereNull('office_id')->first());
    }
    public function update(UpdateAttendanceSettingRequest $request, Office $office)
    {
        $this->authorize('update', $office);
        $settings = AttendanceSetting::firstOrCreate(['office_id' => $office->id]);
        $data = $request->validated(); $settings->update($data);
        $this->audit->record($request, 'attendance_rules.updated', $settings, ['office_id' => $office->id, 'changed_fields' => array_keys($data)]);
        return $this->responseFor($settings->refresh());
    }

    private function responseFor(?AttendanceSetting $settings)
    {
        if (! $settings) {
            return response()->json(null);
        }

        $data = $settings->toArray();
        $data['working_days'] = $settings->working_days ?? [1, 2, 3, 4, 5, 6, 7];

        return response()->json($data);
    }
}
