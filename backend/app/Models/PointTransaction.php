<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class PointTransaction extends Model
{
    const TYPE_EARN = 'earn';
    const TYPE_SPEND = 'spend';
    const TYPE_ADJUST = 'adjust';
    const TYPE_REFUND = 'refund';

    const SOURCE_ORDER = 'order';
    const SOURCE_MANUAL = 'manual';
    const SOURCE_REFUND = 'order_refund';

    protected $fillable = [
        'account_id', 'user_id', 'type', 'source_type', 'source_id',
        'delta', 'balance_after', 'reason', 'operator_id'
    ];

    protected $casts = [
        'delta' => 'integer',
        'balance_after' => 'integer',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(PointAccount::class, 'account_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function operator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'operator_id');
    }

    public function source(): MorphTo
    {
        return $this->morphTo();
    }

    public function getTypeLabelAttribute(): string
    {
        return match ($this->type) {
            self::TYPE_EARN => '获取',
            self::TYPE_SPEND => '消费',
            self::TYPE_ADJUST => '调整',
            self::TYPE_REFUND => '回收',
            default => $this->type,
        };
    }

    public function getSourceLabelAttribute(): string
    {
        return match ($this->source_type) {
            self::SOURCE_ORDER => '消费获取',
            self::SOURCE_MANUAL => '手动调整',
            self::SOURCE_REFUND => '订单取消回收',
            default => $this->source_type,
        };
    }
}
