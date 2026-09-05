<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsAppMessageLog extends Model
{
    protected $table = 'whatsapp_message_logs';
    protected $fillable = [
        'attendance_id',
        'notification_type',
        'recipient',
        'provider',
        'status',
        'idempotency_key',
        'payload',
        'provider_message_id',
        'error_message',
        'attempts',
        'sent_at',
        'failed_at',
    ];
    protected $hidden = ['recipient'];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'sent_at' => 'datetime',
            'failed_at' => 'datetime',
        ];
    }

    public function attendance(): BelongsTo
    {
        return $this->belongsTo(Attendance::class);
    }
}
