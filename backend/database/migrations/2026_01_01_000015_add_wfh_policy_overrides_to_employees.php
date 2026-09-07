<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->boolean('wfh_enabled_override')->nullable()->after('wfh_eligible');
            $table->boolean('wfh_approval_required_override')->nullable()->after('wfh_enabled_override');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['wfh_enabled_override', 'wfh_approval_required_override']);
        });
    }
};
