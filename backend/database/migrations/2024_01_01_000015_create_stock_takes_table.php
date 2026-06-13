<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_takes', function (Blueprint $table) {
            $table->id();
            $table->string('stock_take_no', 32)->unique()->comment('盘点单号');
            $table->string('status', 20)->default('pending')->comment('状态：pending 盘点中，completed 已完成');
            $table->text('remark')->nullable()->comment('备注');
            $table->unsignedBigInteger('operator_id')->nullable()->comment('操作人ID');
            $table->timestamp('completed_at')->nullable()->comment('完成时间');
            $table->timestamps();

            $table->foreign('operator_id')->references('id')->on('users')->onDelete('set null');
            $table->index('status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_takes');
    }
};
