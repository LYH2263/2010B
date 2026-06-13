<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PointAccount extends Model
{
    protected $fillable = [
        'user_id', 'balance', 'total_earned', 'total_spent', 'level_id', 'level_updated_at'
    ];

    protected $casts = [
        'balance' => 'integer',
        'total_earned' => 'integer',
        'total_spent' => 'integer',
        'level_updated_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(MemberLevel::class, 'level_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(PointTransaction::class, 'account_id')->orderBy('id', 'desc');
    }

    public function getNextLevelAttribute()
    {
        return MemberLevel::where('min_points', '>', $this->balance)
            ->where('is_active', true)
            ->orderBy('min_points', 'asc')
            ->first();
    }

    public function getProgressToNextLevelAttribute()
    {
        $nextLevel = $this->next_level;
        if (!$nextLevel) {
            return 100;
        }
        $currentLevelMin = $this->level ? $this->level->min_points : 0;
        $range = $nextLevel->min_points - $currentLevelMin;
        if ($range <= 0) return 100;
        $current = $this->balance - $currentLevelMin;
        return min(100, (int) round(($current / $range) * 100));
    }

    public function getPointsToNextLevelAttribute()
    {
        $nextLevel = $this->next_level;
        if (!$nextLevel) return 0;
        return max(0, $nextLevel->min_points - $this->balance);
    }
}
