<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Employee extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        "employee_code", "name", "email", "mobile", "password", "role",
        "department_id", "designation", "office_id", "joining_date", "status", "wfh_eligible",
    ];

    protected $hidden = ["password", "remember_token"];

    protected function casts(): array
    {
        return [
            "password" => "hashed",
            "joining_date" => "date",
            "wfh_eligible" => "boolean",
        ];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function locationLogs(): HasMany
    {
        return $this->hasMany(LocationLog::class);
    }

    public function leaveRequests(): HasMany { return $this->hasMany(LeaveRequest::class); }
    public function wfhRequests(): HasMany { return $this->hasMany(WfhRequest::class); }

    public function isAdmin(): bool
    {
        return in_array($this->role, ["super_admin", "hr_admin"], true);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isHrAdmin(): bool
    {
        return $this->role === 'hr_admin';
    }

    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }
}
