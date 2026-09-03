<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Office extends Model
{
    use HasFactory;

    protected $fillable = ["name", "address", "latitude", "longitude", "radius", "status"];

    protected function casts(): array
    {
        return [
            "latitude" => "decimal:7",
            "longitude" => "decimal:7",
        ];
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }

    public function attendanceSetting(): HasOne
    {
        return $this->hasOne(AttendanceSetting::class);
    }
}
