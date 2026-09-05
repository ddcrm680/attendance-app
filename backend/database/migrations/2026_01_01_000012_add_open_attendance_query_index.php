<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void { Schema::table('attendance', fn (Blueprint $table) => $table->index(['employee_id', 'check_out', 'attendance_date'])); }
    public function down(): void { Schema::table('attendance', fn (Blueprint $table) => $table->dropIndex(['employee_id', 'check_out', 'attendance_date'])); }
};
