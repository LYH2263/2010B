<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipment_tracks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('shipment_id');
            $table->string('description', 255);
            $table->string('location', 128)->nullable();
            $table->timestamp('tracked_at');
            $table->timestamps();

            $table->foreign('shipment_id')->references('id')->on('shipments')->onDelete('cascade');
            $table->index(['shipment_id', 'tracked_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipment_tracks');
    }
};
