<?php

namespace Database\Seeders;

use App\Models\PointSetting;
use Illuminate\Database\Seeder;

class PointSettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            [
                'key' => PointSetting::KEY_EARN_RATE,
                'value' => '1.0',
                'description' => '积分获取比例：每消费1元获得的积分数',
            ],
            [
                'key' => PointSetting::KEY_ALLOW_DEMOTION,
                'value' => '0',
                'description' => '是否允许降级：0=不允许，1=允许',
            ],
            [
                'key' => PointSetting::KEY_MIN_ORDER_AMOUNT,
                'value' => '0',
                'description' => '最低订单金额：低于此金额的订单不发放积分',
            ],
            [
                'key' => PointSetting::KEY_ROUNDING_MODE,
                'value' => 'floor',
                'description' => '积分计算取整方式：floor=向下取整，ceil=向上取整，round=四舍五入',
            ],
        ];

        foreach ($settings as $setting) {
            PointSetting::firstOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }
    }
}
