<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->string('tracking_no', 64);
            $table->string('logistics_company', 64);
            $table->timestamp('shipped_at')->nullable();
            $table->string('receiver_name', 64)->nullable();
            $table->string('receiver_phone', 32)->nullable();
            $table->string('receiver_address', 255)->nullable();
            $table->string('status', 20)->default('pending');
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->unique(['logistics_company', 'tracking_no']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};
