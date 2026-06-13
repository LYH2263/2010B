<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class PointSetting extends Model
{
    const KEY_EARN_RATE = 'earn_rate';
    const KEY_ALLOW_DEMOTION = 'allow_demotion';
    const KEY_MIN_ORDER_AMOUNT = 'min_order_amount';
    const KEY_ROUNDING_MODE = 'rounding_mode';

    protected $fillable = ['key', 'value', 'description'];

    public static function getValue(string $key, mixed $default = null): mixed
    {
        return Cache::remember("point_setting:{$key}", 3600, function () use ($key, $default) {
            $setting = self::where('key', $key)->first();
            return $setting ? $setting->value : $default;
        });
    }

    public static function getInt(string $key, int $default = 0): int
    {
        return (int) self::getValue($key, $default);
    }

    public static function getBool(string $key, bool $default = false): bool
    {
        $value = self::getValue($key, $default ? '1' : '0');
        return in_array(strtolower((string) $value), ['1', 'true', 'yes', 'on'], true);
    }

    public static function getFloat(string $key, float $default = 0.0): float
    {
        return (float) self::getValue($key, $default);
    }

    protected static function booted(): void
    {
        static::saved(function (PointSetting $setting) {
            Cache::forget("point_setting:{$setting->key}");
        });

        static::deleted(function (PointSetting $setting) {
            Cache::forget("point_setting:{$setting->key}");
        });
    }
}
