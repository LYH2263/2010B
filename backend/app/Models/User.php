<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function pointAccount(): HasOne
    {
        return $this->hasOne(PointAccount::class);
    }

    public function pointTransactions(): HasMany
    {
        return $this->hasMany(PointTransaction::class);
    }

    public function getOrCreatePointAccount(): PointAccount
    {
        $account = $this->pointAccount;
        if ($account) {
            return $account;
        }

        return \App\Models\PointAccount::create([
            'user_id' => $this->id,
            'balance' => 0,
            'total_earned' => 0,
            'total_spent' => 0,
        ]);
    }
}
