<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->index('status');
            $table->index('department_id');
            $table->index('office_id');
        });

        Schema::table('offices', function (Blueprint $table) {
            $table->index('status');
        });

        Schema::table('attendance', function (Blueprint $table) {
            $table->index(['attendance_date', 'status']);
            $table->index(['office_id', 'attendance_date']);
        });

        Schema::table('location_logs', function (Blueprint $table) {
            $table->index(['attendance_id', 'recorded_at']);
            $table->index('recorded_at');
        });
    }

    public function down(): void
    {
        Schema::table('location_logs', function (Blueprint $table) {
            $table->dropIndex(['attendance_id', 'recorded_at']);
            $table->dropIndex(['recorded_at']);
        });

        Schema::table('attendance', function (Blueprint $table) {
            $table->dropIndex(['attendance_date', 'status']);
            $table->dropIndex(['office_id', 'attendance_date']);
        });

        Schema::table('offices', function (Blueprint $table) {
            $table->dropIndex(['status']);
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['department_id']);
            $table->dropIndex(['office_id']);
        });
    }
};
