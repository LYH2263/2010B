<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('point_accounts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->unique();
            $table->unsignedInteger('balance')->default(0);
            $table->unsignedInteger('total_earned')->default(0);
            $table->unsignedInteger('total_spent')->default(0);
            $table->unsignedBigInteger('level_id')->nullable();
            $table->timestamp('level_updated_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('level_id')->references('id')->on('member_levels')->onDelete('set null');
            $table->index('balance');
            $table->index('level_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('point_accounts');
    }
};
