<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\AttendanceSetting;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\Office;
use App\Models\WfhRequest;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class DatabaseSeeder extends Seeder
{
    /** Local-only demonstration accounts all use the password "password123". */
    public function run(): void
    {
        $today = Carbon::today(config('app.timezone'));
        $nextWorkingDay = $this->nextWeekday($today->copy());
        $firstHistoricalDay = $this->previousWeekday($today->copy()->subDay());
        $secondHistoricalDay = $this->previousWeekday($firstHistoricalDay->copy()->subDay());
        $thirdHistoricalDay = $this->previousWeekday($secondHistoricalDay->copy()->subDay());

        $engineering = Department::create(['name' => 'Engineering', 'status' => 'active']);
        $operations = Department::create(['name' => 'Operations', 'status' => 'active']);
        $humanResources = Department::create(['name' => 'Human Resources', 'status' => 'active']);
        $sales = Department::create(['name' => 'Sales', 'status' => 'active']);
        Department::create(['name' => 'Legacy Program', 'status' => 'inactive']);

        $centralOffice = Office::create(['name' => 'Central Office', 'address' => 'Connaught Place, New Delhi, Delhi 110001', 'latitude' => 28.6315000, 'longitude' => 77.2167000, 'radius' => 250, 'status' => 'active']);
        $westOffice = Office::create(['name' => 'Noida Office', 'address' => 'Sector 62, Noida, Uttar Pradesh 201309', 'latitude' => 28.6279000, 'longitude' => 77.3649000, 'radius' => 200, 'status' => 'active']);
        Office::create(['name' => 'Archived Branch', 'address' => 'Closed local demonstration branch', 'latitude' => 28.7041000, 'longitude' => 77.1025000, 'radius' => 150, 'status' => 'inactive']);

        AttendanceSetting::create(['office_id' => null, 'office_start_time' => '09:30:00', 'office_end_time' => '18:30:00', 'grace_period_minutes' => 15, 'minimum_working_minutes' => 480, 'late_after_time' => '09:45:00', 'half_day_after_minutes' => 240, 'overtime_enabled' => true, 'gps_accuracy_threshold_meters' => 100, 'location_tracking_interval_seconds' => 60, 'working_days' => [1, 2, 3, 4, 5], 'wfh_enabled' => false, 'wfh_gps_required' => false, 'wfh_photo_required' => true, 'wfh_approval_required' => true, 'wfh_tracking_enabled' => false]);
        AttendanceSetting::create(['office_id' => $centralOffice->id, 'office_start_time' => '09:30:00', 'office_end_time' => '18:30:00', 'grace_period_minutes' => 15, 'minimum_working_minutes' => 480, 'late_after_time' => '09:45:00', 'half_day_after_minutes' => 240, 'overtime_enabled' => true, 'gps_accuracy_threshold_meters' => 75, 'location_tracking_interval_seconds' => 60, 'working_days' => [1, 2, 3, 4, 5], 'wfh_enabled' => true, 'wfh_gps_required' => false, 'wfh_photo_required' => true, 'wfh_approval_required' => true, 'wfh_tracking_enabled' => true]);
        AttendanceSetting::create(['office_id' => $westOffice->id, 'office_start_time' => '10:00:00', 'office_end_time' => '19:00:00', 'grace_period_minutes' => 10, 'minimum_working_minutes' => 480, 'late_after_time' => '10:10:00', 'half_day_after_minutes' => 240, 'overtime_enabled' => true, 'gps_accuracy_threshold_meters' => 80, 'location_tracking_interval_seconds' => 90, 'working_days' => [1, 2, 3, 4, 5, 6], 'wfh_enabled' => false, 'wfh_gps_required' => true, 'wfh_photo_required' => true, 'wfh_approval_required' => true, 'wfh_tracking_enabled' => false]);

        $superAdmin = $this->employee('ADM-001', 'Aarav Mehta', 'admin@example.com', '9990000001', 'super_admin', $engineering, $centralOffice, 'System Administrator', true, $today->copy()->subYears(3));
        $hrAdmin = $this->employee('HR-001', 'Nisha Kapoor', 'hr@example.com', '9990000002', 'hr_admin', $humanResources, $centralOffice, 'HR Manager', false, $today->copy()->subYears(2));
        $officeEmployee = $this->employee('EMP-1001', 'Alice Verma', 'alice.office@example.com', '9990000003', 'employee', $engineering, $centralOffice, 'Software Engineer', false, $today->copy()->subMonths(18));
        $wfhEmployee = $this->employee('EMP-1002', 'Rohan Iyer', 'rohan.wfh@example.com', '9990000004', 'employee', $engineering, $centralOffice, 'Product Designer', true, $today->copy()->subYear());
        $salesEmployee = $this->employee('EMP-1003', 'Meera Shah', 'meera.sales@example.com', '9990000005', 'employee', $sales, $westOffice, 'Sales Executive', false, $today->copy()->subMonths(10));
        $operationsEmployee = $this->employee('EMP-1004', 'Kabir Singh', 'kabir.ops@example.com', '9990000006', 'employee', $operations, $westOffice, 'Operations Analyst', true, $today->copy()->subMonths(7));
        $this->employee('EMP-1005', 'Inactive Demo User', 'inactive.demo@example.com', '9990000007', 'employee', $operations, $westOffice, 'Former Associate', false, $today->copy()->subYears(2), 'inactive');

        $annualLeave = LeaveType::create(['name' => 'Annual Leave', 'active' => true, 'reason_required' => false]);
        $sickLeave = LeaveType::create(['name' => 'Sick Leave', 'active' => true, 'reason_required' => true]);
        $unpaidLeave = LeaveType::create(['name' => 'Unpaid Leave', 'active' => true, 'reason_required' => true]);
        LeaveType::create(['name' => 'Legacy Leave', 'active' => false, 'reason_required' => false]);

        LeaveRequest::create(['employee_id' => $officeEmployee->id, 'leave_type_id' => $annualLeave->id, 'start_date' => $nextWorkingDay->copy()->addDays(7)->toDateString(), 'end_date' => $nextWorkingDay->copy()->addDays(8)->toDateString(), 'reason' => 'Planned personal leave.', 'status' => 'approved', 'reviewed_by' => $hrAdmin->id, 'reviewed_at' => $today->copy()->subDay()->setTime(15, 0)]);
        LeaveRequest::create(['employee_id' => $salesEmployee->id, 'leave_type_id' => $sickLeave->id, 'start_date' => $nextWorkingDay->copy()->addDays(3)->toDateString(), 'end_date' => $nextWorkingDay->copy()->addDays(3)->toDateString(), 'reason' => 'Medical appointment.', 'status' => 'pending']);
        LeaveRequest::create(['employee_id' => $operationsEmployee->id, 'leave_type_id' => $unpaidLeave->id, 'start_date' => $nextWorkingDay->copy()->addDays(12)->toDateString(), 'end_date' => $nextWorkingDay->copy()->addDays(13)->toDateString(), 'reason' => 'Requested extension beyond available balance.', 'status' => 'rejected', 'reviewed_by' => $hrAdmin->id, 'reviewed_at' => $today->copy()->subDay()->setTime(16, 0)]);

        Holiday::create(['name' => 'Company Foundation Day', 'holiday_date' => $nextWorkingDay->copy()->addDays(20)->toDateString(), 'active' => true]);
        Holiday::create(['name' => 'Regional Festival', 'holiday_date' => $nextWorkingDay->copy()->addDays(35)->toDateString(), 'active' => true]);
        Holiday::create(['name' => 'Archived Holiday Example', 'holiday_date' => $nextWorkingDay->copy()->addDays(50)->toDateString(), 'active' => false]);

        WfhRequest::create(['employee_id' => $wfhEmployee->id, 'attendance_date' => $thirdHistoricalDay->toDateString(), 'reason' => 'Approved remote design day.', 'status' => 'approved', 'reviewed_by' => $hrAdmin->id, 'reviewed_at' => $thirdHistoricalDay->copy()->subDay()->setTime(16, 0)]);
        WfhRequest::create(['employee_id' => $wfhEmployee->id, 'attendance_date' => $nextWorkingDay->copy()->addDays(4)->toDateString(), 'reason' => 'Home internet installation appointment.', 'status' => 'pending']);
        WfhRequest::create(['employee_id' => $operationsEmployee->id, 'attendance_date' => $nextWorkingDay->copy()->addDays(9)->toDateString(), 'reason' => 'Remote work requested for a personal delivery.', 'status' => 'rejected', 'reviewed_by' => $hrAdmin->id, 'reviewed_at' => $today->copy()->subDay()->setTime(14, 0)]);

        // Completed legacy-safe records intentionally have no photo or GPS fields.
        $this->attendance($officeEmployee, $centralOffice, $firstHistoricalDay, 'office', 'present', '09:05:00', '18:20:00', 555, 75, 0, 10);
        $this->attendance($salesEmployee, $westOffice, $secondHistoricalDay, 'office', 'late', '10:25:00', '19:00:00', 515, 35, 15, 0);
        $this->attendance($wfhEmployee, $centralOffice, $thirdHistoricalDay, 'wfh', 'work_from_home', '09:10:00', '18:10:00', 540, 60, 0, 20);

        // Safe, non-secret examples make the append-only audit screen useful locally.
        AuditLog::create(['actor_id' => $superAdmin->id, 'employee_id' => $officeEmployee->id, 'action' => 'employee.created', 'resource_type' => 'Employee', 'resource_id' => $officeEmployee->id, 'ip_address' => '127.0.0.1', 'user_agent' => 'Local demo seeder', 'metadata' => ['source' => 'local_demo']]);
        AuditLog::create(['actor_id' => $hrAdmin->id, 'employee_id' => $officeEmployee->id, 'action' => 'leave.approved', 'resource_type' => 'LeaveRequest', 'resource_id' => 1, 'ip_address' => '127.0.0.1', 'user_agent' => 'Local demo seeder', 'metadata' => ['source' => 'local_demo']]);
        AuditLog::create(['actor_id' => $superAdmin->id, 'employee_id' => $wfhEmployee->id, 'action' => 'wfh.approved', 'resource_type' => 'WfhRequest', 'resource_id' => 1, 'ip_address' => '127.0.0.1', 'user_agent' => 'Local demo seeder', 'metadata' => ['source' => 'local_demo']]);
    }

    private function employee(string $code, string $name, string $email, string $mobile, string $role, Department $department, Office $office, string $designation, bool $wfhEligible, Carbon $joiningDate, string $status = 'active'): Employee
    {
        return Employee::create(['employee_code' => $code, 'name' => $name, 'email' => $email, 'mobile' => $mobile, 'password' => 'password123', 'role' => $role, 'department_id' => $department->id, 'designation' => $designation, 'office_id' => $office->id, 'joining_date' => $joiningDate->toDateString(), 'status' => $status, 'wfh_eligible' => $wfhEligible]);
    }

    private function attendance(Employee $employee, Office $office, Carbon $date, string $mode, string $status, string $checkIn, string $checkOut, int $workingMinutes, int $overtimeMinutes, int $lateMinutes, int $earlyDepartureMinutes): void
    {
        Attendance::create(['employee_id' => $employee->id, 'office_id' => $office->id, 'mode' => $mode, 'attendance_date' => $date->toDateString(), 'check_in' => $date->copy()->setTimeFromTimeString($checkIn), 'check_out' => $date->copy()->setTimeFromTimeString($checkOut), 'status' => $status, 'working_minutes' => $workingMinutes, 'overtime_minutes' => $overtimeMinutes, 'late_minutes' => $lateMinutes, 'early_departure_minutes' => $earlyDepartureMinutes, 'fraud_flag' => false]);
    }

    private function nextWeekday(Carbon $date): Carbon
    {
        do { $date->addDay(); } while ($date->isWeekend());
        return $date;
    }

    private function previousWeekday(Carbon $date): Carbon
    {
        while ($date->isWeekend()) { $date->subDay(); }
        return $date;
    }
}
