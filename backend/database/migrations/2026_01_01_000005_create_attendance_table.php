<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create("attendance", function (Blueprint $table) {
            $table->id();
            $table->foreignId("employee_id")->constrained("employees")->cascadeOnDelete();
            $table->foreignId("office_id")->nullable()->constrained("offices")->nullOnDelete();
            $table->date("attendance_date");

            $table->dateTime("check_in")->nullable();
            $table->dateTime("check_out")->nullable();

            $table->decimal("check_in_latitude", 10, 7)->nullable();
            $table->decimal("check_in_longitude", 10, 7)->nullable();
            $table->decimal("check_in_accuracy", 8, 2)->nullable();
            $table->decimal("check_in_distance_meters", 8, 2)->nullable();

            $table->decimal("check_out_latitude", 10, 7)->nullable();
            $table->decimal("check_out_longitude", 10, 7)->nullable();
            $table->decimal("check_out_accuracy", 8, 2)->nullable();
            $table->decimal("check_out_distance_meters", 8, 2)->nullable();

            $table->enum("status", [
                "present", "absent", "late", "half_day", "work_from_home",
            ])->default("present");

            $table->unsignedInteger("working_minutes")->default(0);
            $table->unsignedInteger("overtime_minutes")->default(0);
            $table->unsignedInteger("late_minutes")->default(0);

            $table->boolean("fraud_flag")->default(false);
            $table->string("fraud_reason")->nullable();

            $table->text("remarks")->nullable();
            $table->timestamps();

            $table->unique(["employee_id", "attendance_date"]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists("attendance");
    }
};
