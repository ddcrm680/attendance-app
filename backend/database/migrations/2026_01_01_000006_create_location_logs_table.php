<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create("location_logs", function (Blueprint $table) {
            $table->id();
            $table->foreignId("employee_id")->constrained("employees")->cascadeOnDelete();
            $table->foreignId("attendance_id")->nullable()->constrained("attendance")->cascadeOnDelete();
            $table->decimal("latitude", 10, 7);
            $table->decimal("longitude", 10, 7);
            $table->decimal("accuracy", 8, 2)->nullable();
            $table->dateTime("recorded_at");
            $table->timestamp("created_at")->useCurrent();

            $table->index(["employee_id", "recorded_at"]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists("location_logs");
    }
};
