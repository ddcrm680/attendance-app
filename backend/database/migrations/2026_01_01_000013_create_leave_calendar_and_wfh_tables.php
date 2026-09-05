<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('leave_types', function (Blueprint $table) { $table->id(); $table->string('name')->unique(); $table->boolean('active')->default(true); $table->boolean('reason_required')->default(false); $table->timestamps(); });
        Schema::create('leave_requests', function (Blueprint $table) { $table->id(); $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete(); $table->foreignId('leave_type_id')->constrained('leave_types'); $table->date('start_date'); $table->date('end_date'); $table->text('reason')->nullable(); $table->string('status')->default('pending'); $table->foreignId('reviewed_by')->nullable()->constrained('employees')->nullOnDelete(); $table->timestamp('reviewed_at')->nullable(); $table->timestamp('cancelled_at')->nullable(); $table->timestamps(); $table->index(['employee_id', 'start_date', 'end_date']); });
        Schema::create('holidays', function (Blueprint $table) { $table->id(); $table->string('name'); $table->date('holiday_date')->unique(); $table->boolean('active')->default(true); $table->timestamps(); });
        Schema::create('wfh_requests', function (Blueprint $table) { $table->id(); $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete(); $table->date('attendance_date'); $table->text('reason')->nullable(); $table->string('status')->default('pending'); $table->foreignId('reviewed_by')->nullable()->constrained('employees')->nullOnDelete(); $table->timestamp('reviewed_at')->nullable(); $table->timestamps(); $table->unique(['employee_id', 'attendance_date']); });
        Schema::table('employees', fn (Blueprint $table) => $table->boolean('wfh_eligible')->default(false)->after('status'));
        Schema::table('attendance', fn (Blueprint $table) => $table->string('mode')->default('office')->after('office_id'));
        Schema::table('attendance_settings', function (Blueprint $table) { $table->text('working_days')->nullable()->after('location_tracking_interval_seconds'); $table->boolean('wfh_enabled')->default(false); $table->boolean('wfh_gps_required')->default(false); $table->boolean('wfh_photo_required')->default(true); $table->boolean('wfh_approval_required')->default(true); $table->boolean('wfh_tracking_enabled')->default(false); });
    }
    public function down(): void
    {
        Schema::table('attendance_settings', fn (Blueprint $table) => $table->dropColumn(['working_days','wfh_enabled','wfh_gps_required','wfh_photo_required','wfh_approval_required','wfh_tracking_enabled']));
        Schema::table('attendance', fn (Blueprint $table) => $table->dropColumn('mode'));
        Schema::table('employees', fn (Blueprint $table) => $table->dropColumn('wfh_eligible'));
        Schema::dropIfExists('wfh_requests'); Schema::dropIfExists('holidays'); Schema::dropIfExists('leave_requests'); Schema::dropIfExists('leave_types');
    }
};
