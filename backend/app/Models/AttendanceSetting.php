<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceSetting extends Model
{
    protected $fillable = [
        "office_id", "office_start_time", "office_end_time", "grace_period_minutes",
        "minimum_working_minutes", "late_after_time", "half_day_after_minutes",
        "overtime_enabled", "gps_accuracy_threshold_meters", "location_tracking_interval_seconds",
    ];

    protected function casts(): array
    {
        return ["overtime_enabled" => "boolean"];
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class);
    }
}
