<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('attendance', function (Blueprint $table) {
            $table->enum('status', ['present', 'absent', 'late', 'half_day', 'partial', 'work_from_home'])->default('present')->change();
        });
    }

    public function down(): void
    {
        Schema::table('attendance', function (Blueprint $table) {
            $table->enum('status', ['present', 'absent', 'late', 'half_day', 'work_from_home'])->default('present')->change();
        });
    }
};
