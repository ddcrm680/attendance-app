<?php

namespace App\Models;

use LogicException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    public const UPDATED_AT = null;
    protected $fillable = ['actor_id', 'employee_id', 'action', 'resource_type', 'resource_id', 'ip_address', 'user_agent', 'metadata'];
    protected function casts(): array { return ['metadata' => 'array']; }
    public function actor(): BelongsTo { return $this->belongsTo(Employee::class, 'actor_id'); }
    public function employee(): BelongsTo { return $this->belongsTo(Employee::class, 'employee_id'); }
    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('Audit records are append-only.'));
        static::deleting(fn () => throw new LogicException('Audit records cannot be deleted through the application.'));
    }
}
