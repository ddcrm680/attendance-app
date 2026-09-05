<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class WfhRequest extends Model { protected $fillable=['employee_id','attendance_date','reason','status','reviewed_by','reviewed_at']; protected function casts(): array{return ['attendance_date'=>'date','reviewed_at'=>'datetime'];} public function employee():BelongsTo{return $this->belongsTo(Employee::class);} }
