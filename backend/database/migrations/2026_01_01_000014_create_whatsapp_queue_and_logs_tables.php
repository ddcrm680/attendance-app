<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('jobs', function (Blueprint $table) {
            $table->id(); $table->string('queue')->index(); $table->longText('payload'); $table->unsignedTinyInteger('attempts'); $table->unsignedInteger('reserved_at')->nullable(); $table->unsignedInteger('available_at'); $table->unsignedInteger('created_at');
        });
        Schema::create('failed_jobs', function (Blueprint $table) {
            $table->id(); $table->string('uuid')->unique(); $table->text('connection'); $table->text('queue'); $table->longText('payload'); $table->longText('exception'); $table->timestamp('failed_at')->useCurrent();
        });
        Schema::create('whatsapp_message_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_id')->nullable()->constrained('attendance')->nullOnDelete();
            $table->string('notification_type'); $table->string('recipient'); $table->string('provider'); $table->string('status')->default('queued');
            $table->string('idempotency_key')->unique(); $table->json('payload')->nullable(); $table->string('provider_message_id')->nullable()->index();
            $table->string('error_message')->nullable(); $table->unsignedInteger('attempts')->default(0); $table->timestamp('sent_at')->nullable(); $table->timestamp('failed_at')->nullable(); $table->timestamps();
            $table->index(['status', 'created_at']); $table->index(['attendance_id', 'notification_type']);
        });
    }
    public function down(): void { Schema::dropIfExists('whatsapp_message_logs'); Schema::dropIfExists('failed_jobs'); Schema::dropIfExists('jobs'); }
};
