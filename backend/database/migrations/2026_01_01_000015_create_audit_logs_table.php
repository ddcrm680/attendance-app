<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id(); $table->foreignId('actor_id')->nullable()->constrained('employees')->nullOnDelete(); $table->foreignId('employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->string('action', 100); $table->string('resource_type', 100); $table->unsignedBigInteger('resource_id')->nullable();
            $table->string('ip_address', 45)->nullable(); $table->string('user_agent', 512)->nullable(); $table->json('metadata')->nullable(); $table->timestamp('created_at')->useCurrent();
            $table->index(['created_at']); $table->index(['actor_id', 'created_at']); $table->index(['employee_id', 'created_at']); $table->index(['action', 'created_at']); $table->index(['resource_type', 'resource_id']);
        });
    }
    public function down(): void { Schema::dropIfExists('audit_logs'); }
};
