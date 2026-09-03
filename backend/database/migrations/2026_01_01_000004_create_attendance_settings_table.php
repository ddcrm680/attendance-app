<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create("attendance_settings", function (Blueprint $table) {
            $table->id();
            $table->foreignId("office_id")->nullable()->unique()->constrained("offices")->cascadeOnDelete();
            $table->time("office_start_time")->default("09:30:00");
            $table->time("office_end_time")->default("18:30:00");
            $table->unsignedInteger("grace_period_minutes")->default(15);
            $table->unsignedInteger("minimum_working_minutes")->default(480);
            $table->time("late_after_time")->default("09:45:00");
            $table->unsignedInteger("half_day_after_minutes")->default(240);
            $table->boolean("overtime_enabled")->default(true);
            $table->unsignedInteger("gps_accuracy_threshold_meters")->default(100);
            $table->unsignedInteger("location_tracking_interval_seconds")->default(60);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists("attendance_settings");
    }
};
