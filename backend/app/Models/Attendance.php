<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Attendance extends Model
{
    use HasFactory;

    protected $table = "attendance";

    protected $fillable = [
        "employee_id", "office_id", "mode", "attendance_date", "check_in", "check_out", "check_in_photo_path", "check_out_photo_path",
        "check_in_latitude", "check_in_longitude", "check_in_accuracy", "check_in_distance_meters",
        "check_out_latitude", "check_out_longitude", "check_out_accuracy", "check_out_distance_meters",
        "status", "working_minutes", "overtime_minutes", "late_minutes", "early_departure_minutes",
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

    protected $hidden = ['check_in_photo_path', 'check_out_photo_path'];

    /**
     * SQLite does not coerce a datetime string to a DATE column as MySQL does.
     * Store this business key in its canonical date-only form so all employee
     * check-in, check-out, and history queries use the unique key consistently.
     */
    protected function attendanceDate(): Attribute
    {
        return Attribute::make(
            set: fn ($value) => $value === null ? null : Carbon::parse($value)->toDateString(),
        );
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
