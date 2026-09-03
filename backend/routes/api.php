<?php

use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\EmployeeController;
use App\Http\Controllers\Api\Admin\OfficeController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\LocationController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::prefix('attendance')->group(function () {
        Route::post('/check-in', [AttendanceController::class, 'checkInTest']);
        Route::post('/check-out', [AttendanceController::class, 'checkOutTest']);
        Route::get('/today', [AttendanceController::class, 'today']);
        Route::get('/history', [AttendanceController::class, 'history']);
    });

    Route::prefix('location')->group(function () {
        Route::post('/update', [LocationController::class, 'update']);
        Route::get('/current', [LocationController::class, 'current']);
        Route::get('/history', [LocationController::class, 'history']);
    });

    Route::prefix('admin')->middleware('admin')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'stats']);
        Route::get('/live-employees', [DashboardController::class, 'liveEmployees']);

        Route::apiResource('employees', EmployeeController::class);
        Route::apiResource('offices', OfficeController::class);
    });
});
