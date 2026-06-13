<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => '管理员',
                'password' => Hash::make('admin123'),
            ]
        );

        $customers = [
            ['name' => '张三', 'email' => 'zhangsan@example.com'],
            ['name' => '李四', 'email' => 'lisi@example.com'],
            ['name' => '王五', 'email' => 'wangwu@example.com'],
            ['name' => '赵六', 'email' => 'zhaoliu@example.com'],
            ['name' => '陈七', 'email' => 'chenqi@example.com'],
            ['name' => '刘八', 'email' => 'liuba@example.com'],
            ['name' => '周九', 'email' => 'zhoujiu@example.com'],
            ['name' => '吴十', 'email' => 'wushi@example.com'],
        ];

        foreach ($customers as $customer) {
            User::firstOrCreate(
                ['email' => $customer['email']],
                [
                    'name' => $customer['name'],
                    'password' => Hash::make('customer123'),
                ]
            );
        }
    }
}
