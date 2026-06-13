<?php

namespace Database\Seeders;

use App\Models\MemberLevel;
use Illuminate\Database\Seeder;

class MemberLevelSeeder extends Seeder
{
    public function run(): void
    {
        $levels = [
            [
                'name' => '普通会员',
                'min_points' => 0,
                'color' => '#6b7280',
                'benefits' => '基础购物权益',
                'sort' => 1,
            ],
            [
                'name' => '银卡会员',
                'min_points' => 1000,
                'color' => '#9ca3af',
                'benefits' => '95折优惠、优先发货',
                'sort' => 2,
            ],
            [
                'name' => '金卡会员',
                'min_points' => 5000,
                'color' => '#d97706',
                'benefits' => '9折优惠、专属客服、生日礼包',
                'sort' => 3,
            ],
            [
                'name' => '钻石会员',
                'min_points' => 20000,
                'color' => '#2563eb',
                'benefits' => '85折优惠、专属客服、免费配送、VIP活动邀请',
                'sort' => 4,
            ],
        ];

        foreach ($levels as $level) {
            MemberLevel::firstOrCreate(
                ['name' => $level['name']],
                $level
            );
        }
    }
}
