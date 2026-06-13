<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PriceHistory extends Model
{
    const TYPE_FIXED = 'fixed';
    const TYPE_PERCENTAGE = 'percentage';
    const TYPE_AMOUNT = 'amount';

    protected $fillable = [
        'product_id', 'old_price', 'new_price', 'change_amount',
        'change_percent', 'change_type', 'reason', 'user_id'
    ];

    protected $casts = [
        'old_price' => 'decimal:2',
        'new_price' => 'decimal:2',
        'change_amount' => 'decimal:2',
        'change_percent' => 'decimal:2',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
