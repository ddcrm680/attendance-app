<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AttendancePunchRequest;
use App\Models\Attendance;
use App\Models\Employee;
use App\Services\AttendanceService;
use App\Services\AttendanceSettingsResolver;
use App\Services\AttendanceRules;
use App\Services\AttendancePhotoService;
use App\Services\VerifiedLocationService;
use App\Services\AttendanceCalendarService;
use App\Services\WfhEligibilityService;
use App\Services\WhatsAppNotificationService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AttendanceController extends Controller
{
    public function __construct(private AttendanceService $attendance, private AttendanceSettingsResolver $settings, private AttendanceRules $rules, private AttendancePhotoService $photos, private VerifiedLocationService $locations, private AttendanceCalendarService $calendar, private WfhEligibilityService $wfh, private WhatsAppNotificationService $whatsApp) {}

    public function checkIn(AttendancePunchRequest $request)
    {
        /** @var Employee $employee */
        $employee = $request->user();
        $office = $employee->office;
        if (! $office) return response()->json(['message' => 'No office is assigned to your profile. Contact HR.'], 422);
        $data = $request->validated(); $mode = $data['mode']; $this->calendar->assertAttendanceAllowed($employee, now());
        $setting=$this->settings->forOffice($office); if($mode==='wfh')$this->wfh->assertAllowed($employee, now());
        $requiresGps=$mode==='office'||$setting?->wfh_gps_required; $requiresPhoto=$mode==='office'||$setting?->wfh_photo_required;
        if($requiresPhoto&&!$request->hasFile('photo')) throw ValidationException::withMessages(['photo'=>[$mode==='wfh'?'Photo is required to mark work-from-home attendance.':'Photo is required to mark attendance.']]);
        if($requiresGps && (!isset($data['latitude'],$data['longitude'],$data['accuracy']))) throw ValidationException::withMessages(['location'=>['Location is required for this attendance mode.']]);
        $location=$requiresGps?$this->locations->verify($office,$data):null;
        $photoPath=$request->hasFile('photo')?$this->photos->store($request->file('photo'),$employee,'check_in'):null;
        try {
            $record = $this->attendance->checkIn($employee, $office, $location, $photoPath, now(), $mode);
        } catch (\Throwable $exception) {
            $this->photos->delete($photoPath);
            throw $exception;
        }
        $this->whatsApp->queueAttendance($record, 'punch_in');
        if ($record->status === 'late') $this->whatsApp->queueAttendance($record, 'late');
        return response()->json(['message' => 'Attendance marked successfully', 'attendance' => $record], 201);
    }

    public function checkOut(AttendancePunchRequest $request)
    {
        /** @var Employee $employee */
        $employee = $request->user();
        $open = Attendance::where('employee_id', $employee->id)->whereNotNull('check_in')->whereNull('check_out')->orderByDesc('attendance_date')->first();
        if (! $open) return response()->json(['message' => 'You have not checked in for an open shift.'], 409);
        if (! $open->office) return response()->json(['message' => 'The attendance office is no longer available. Contact HR.'], 422);
        $data=$request->validated(); $setting=$this->settings->forOffice($open->office); $requiresGps=$open->mode==='office'||$setting?->wfh_gps_required; $requiresPhoto=$open->mode==='office'||$setting?->wfh_photo_required;
        if($requiresPhoto&&!$request->hasFile('photo')) throw ValidationException::withMessages(['photo'=>['Please take a selfie to complete your attendance.']]);
        if($requiresGps && (!isset($data['latitude'],$data['longitude'],$data['accuracy']))) throw ValidationException::withMessages(['location'=>['Location is required for this attendance mode.']]);
        $location=$requiresGps?$this->locations->verify($open->office,$data):null; $photoPath=$request->hasFile('photo')?$this->photos->store($request->file('photo'),$employee,'check_out'):null;
        try {
            $record = $this->attendance->checkOut($employee, now(), $location, $photoPath);
        } catch (\Throwable $exception) {
            $this->photos->delete($photoPath);
            throw $exception;
        }
        $this->whatsApp->queueAttendance($record, 'punch_out');
        return response()->json(['message' => 'Attendance completed', 'attendance' => $record]);
    }

    public function today(Request $request)
    {
        $this->authorize('viewAny', Attendance::class);
        /** @var Employee $employee */
        $employee = $request->user();
        $date = $this->rules->businessDate(now(), $this->settings->forOffice($employee->office));
        return response()->json(Attendance::where('employee_id', $employee->id)->where('attendance_date', $date)->first());
    }

    public function history(Request $request)
    {
        $this->authorize('viewAny', Attendance::class);
        $data = $request->validate(['from' => ['nullable', 'date'], 'to' => ['nullable', 'date'], 'per_page' => ['nullable', 'integer', 'min:1', 'max:100']]);
        $query = Attendance::where('employee_id', $request->user()->id)->orderByDesc('attendance_date');
        if (isset($data['from'])) $query->where('attendance_date', '>=', $data['from']);
        if (isset($data['to'])) $query->where('attendance_date', '<=', $data['to']);
        return response()->json($query->paginate($data['per_page'] ?? 30));
    }

    public function show(Request $request, Attendance $attendance)
    {
        $this->authorize('view', $attendance);
        return response()->json($attendance->load(['office:id,name,address', 'locationLogs' => fn ($query) => $query->latest('recorded_at')->limit(1)]));
    }

    public function photo(Request $request, Attendance $attendance, string $punch)
    {
        $this->authorize('view', $attendance);
        abort_unless(in_array($punch, ['check_in', 'check_out'], true), 404);
        return $this->photos->response($attendance, $punch);
    }

}
