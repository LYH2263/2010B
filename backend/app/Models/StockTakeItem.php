<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockTakeItem extends Model
{
    protected $fillable = [
        'stock_take_id', 'product_id', 'book_quantity', 'actual_quantity', 'difference'
    ];

    protected $casts = [
        'book_quantity' => 'integer',
        'actual_quantity' => 'integer',
        'difference' => 'integer',
    ];

    public function stockTake(): BelongsTo
    {
        return $this->belongsTo(StockTake::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function getDifferenceTypeAttribute(): string
    {
        if ($this->difference > 0) {
            return 'surplus';
        } elseif ($this->difference < 0) {
            return 'shortage';
        }
        return 'match';
    }

    public function getDifferenceLabelAttribute(): string
    {
        if ($this->difference > 0) {
            return '盘盈';
        } elseif ($this->difference < 0) {
            return '盘亏';
        }
        return '一致';
    }
}
