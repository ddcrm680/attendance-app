<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LocationLog extends Model
{
    public $timestamps = false;

    protected $fillable = ["employee_id", "attendance_id", "latitude", "longitude", "accuracy", "recorded_at"];

    protected function casts(): array
    {
        return ["recorded_at" => "datetime"];
    }

    protected static function booted(): void
    {
        static::creating(function (LocationLog $log) {
            $log->created_at ??= now();
        });
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function attendance(): BelongsTo
    {
        return $this->belongsTo(Attendance::class);
    }
}
