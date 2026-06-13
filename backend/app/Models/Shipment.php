<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shipment extends Model
{
    const STATUS_PENDING = 'pending';
    const STATUS_SHIPPED = 'shipped';
    const STATUS_IN_TRANSIT = 'in_transit';
    const STATUS_DELIVERED = 'delivered';

    protected $fillable = [
        'order_id', 'tracking_no', 'logistics_company',
        'shipped_at', 'receiver_name', 'receiver_phone',
        'receiver_address', 'status'
    ];

    protected $casts = [
        'shipped_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function tracks(): HasMany
    {
        return $this->hasMany(ShipmentTrack::class)->orderBy('tracked_at', 'desc');
    }
}
