<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveType extends Model
{
    protected $fillable = [
        'name',
        'active',
        'reason_required',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'reason_required' => 'boolean',
        ];
    }
}
