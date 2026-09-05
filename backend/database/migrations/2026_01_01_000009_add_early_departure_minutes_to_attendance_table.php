<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void { Schema::table('attendance', fn (Blueprint $table) => $table->unsignedInteger('early_departure_minutes')->default(0)->after('late_minutes')); }
    public function down(): void { Schema::table('attendance', fn (Blueprint $table) => $table->dropColumn('early_departure_minutes')); }
};
