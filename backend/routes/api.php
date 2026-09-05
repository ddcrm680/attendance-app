<?php

use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\DepartmentController;
use App\Http\Controllers\Api\Admin\EmployeeController;
use App\Http\Controllers\Api\Admin\OfficeController;
use App\Http\Controllers\Api\Admin\AttendanceSettingController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\LeaveController;
use App\Http\Controllers\Api\WfhController;
use App\Http\Controllers\Api\CalendarController;
use App\Http\Controllers\Api\Admin\LeaveManagementController;
use App\Http\Controllers\Api\Admin\HolidayController;
use App\Http\Controllers\Api\Admin\WfhManagementController;
use App\Http\Controllers\Api\Admin\AttendanceReportController;
use App\Http\Controllers\Api\Admin\WhatsAppController;
use App\Http\Controllers\Api\Admin\AuditLogController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::prefix('attendance')->group(function () {
        Route::post('/check-in', [AttendanceController::class, 'checkIn'])->middleware('throttle:attendance');
        Route::post('/check-out', [AttendanceController::class, 'checkOut'])->middleware('throttle:attendance');
        Route::get('/today', [AttendanceController::class, 'today']);
        Route::get('/history', [AttendanceController::class, 'history']);
        Route::get('/{attendance}/photos/{punch}', [AttendanceController::class, 'photo'])->middleware('throttle:photo');
        Route::get('/{attendance}', [AttendanceController::class, 'show']);
    });

    Route::prefix('location')->group(function () {
        Route::get('/tracking-status', [LocationController::class, 'trackingStatus']);
        Route::post('/update', [LocationController::class, 'update'])->middleware('throttle:location');
        Route::get('/current', [LocationController::class, 'current']);
        Route::get('/history', [LocationController::class, 'history']);
    });
    Route::get('/calendar', [CalendarController::class, 'overview']);
    Route::get('/leave-types', [LeaveController::class, 'types']);
    Route::get('/leaves', [LeaveController::class, 'index']); Route::post('/leaves', [LeaveController::class, 'store']); Route::post('/leaves/{leave}/cancel', [LeaveController::class, 'cancel']);
    Route::get('/wfh-requests', [WfhController::class, 'index']); Route::post('/wfh-requests', [WfhController::class, 'store']);

    Route::prefix('admin')->middleware(['admin', 'throttle:admin-api'])->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'stats']);
        Route::get('/dashboard/charts', [DashboardController::class, 'charts']);
        Route::get('/live-employees', [DashboardController::class, 'liveEmployees']);
        Route::get('/attendance', [AttendanceReportController::class, 'index']); Route::get('/attendance/{attendance}', [AttendanceReportController::class, 'show']); Route::get('/reports/export/{format}', [AttendanceReportController::class, 'export']);
        Route::get('/whatsapp/logs', [WhatsAppController::class, 'index']); Route::get('/whatsapp/settings', [WhatsAppController::class, 'settings']); Route::post('/whatsapp/daily-summary', [WhatsAppController::class, 'daily'])->middleware('role:super_admin');
        Route::get('/audit-logs', [AuditLogController::class, 'index']); Route::get('/audit-logs/{auditLog}', [AuditLogController::class, 'show']);
        Route::get('/leaves', [LeaveManagementController::class, 'index']); Route::patch('/leaves/{leave}', [LeaveManagementController::class, 'review']); Route::get('/leave-types', [LeaveManagementController::class, 'types']); Route::post('/leave-types', [LeaveManagementController::class, 'storeType']); Route::patch('/leave-types/{leaveType}', [LeaveManagementController::class, 'updateType']);
        Route::apiResource('holidays', HolidayController::class)->except('show');
        Route::get('/wfh-requests', [WfhManagementController::class, 'index']); Route::patch('/wfh-requests/{wfh}', [WfhManagementController::class, 'review']); Route::patch('/employees/{employee}/wfh-eligibility', [WfhManagementController::class, 'eligibility']);

        Route::apiResource('employees', EmployeeController::class);
        Route::apiResource('departments', DepartmentController::class);
        Route::apiResource('offices', OfficeController::class);
        Route::get('offices/{office}/attendance-settings', [AttendanceSettingController::class, 'show']);
        Route::put('offices/{office}/attendance-settings', [AttendanceSettingController::class, 'update']);
    });
});
