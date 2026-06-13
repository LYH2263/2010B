<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShipmentTrack extends Model
{
    protected $fillable = ['shipment_id', 'description', 'location', 'tracked_at'];

    protected $casts = [
        'tracked_at' => 'datetime',
    ];

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }
}
