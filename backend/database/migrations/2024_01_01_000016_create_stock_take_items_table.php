<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_take_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('stock_take_id')->comment('盘点单ID');
            $table->unsignedBigInteger('product_id')->comment('商品ID');
            $table->integer('book_quantity')->default(0)->comment('账面数量');
            $table->integer('actual_quantity')->nullable()->comment('实盘数量');
            $table->integer('difference')->default(0)->comment('差异（实盘-账面）');
            $table->timestamps();

            $table->foreign('stock_take_id')->references('id')->on('stock_takes')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->unique(['stock_take_id', 'product_id']);
            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_take_items');
    }
};
