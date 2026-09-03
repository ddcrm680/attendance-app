<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Attendance extends Model
{
    use HasFactory;

    protected $table = "attendance";

    protected $fillable = [
        "employee_id", "office_id", "attendance_date", "check_in", "check_out",
        "check_in_latitude", "check_in_longitude", "check_in_accuracy", "check_in_distance_meters",
        "check_out_latitude", "check_out_longitude", "check_out_accuracy", "check_out_distance_meters",
        "status", "working_minutes", "overtime_minutes", "late_minutes",
        "fraud_flag", "fraud_reason", "remarks",
    ];

    protected function casts(): array
    {
        return [
            "attendance_date" => "date",
            "check_in" => "datetime",
            "check_out" => "datetime",
            "fraud_flag" => "boolean",
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class);
    }

    public function locationLogs(): HasMany
    {
        return $this->hasMany(LocationLog::class);
    }
}
