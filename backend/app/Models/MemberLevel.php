<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MemberLevel extends Model
{
    protected $fillable = [
        'name', 'min_points', 'color', 'benefits', 'sort', 'is_active'
    ];

    protected $casts = [
        'min_points' => 'integer',
        'sort' => 'integer',
        'is_active' => 'boolean',
    ];

    public function accounts(): HasMany
    {
        return $this->hasMany(PointAccount::class, 'level_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('sort', 'asc')->orderBy('min_points', 'asc');
    }
}
