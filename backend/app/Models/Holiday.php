<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Holiday extends Model { protected $fillable=['name','holiday_date','active']; protected function casts(): array{return ['holiday_date'=>'date','active'=>'boolean'];} }
