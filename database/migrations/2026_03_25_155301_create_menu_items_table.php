<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('menu_items', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();        // bot key: 'chicken', 'burger', etc.
            $table->string('name');
            $table->string('category')->default('Mains');
            $table->decimal('price', 8, 2);
            $table->string('description')->nullable();
            $table->string('emoji')->default('🍽️');
            $table->string('image_path')->nullable();  // relative path in storage/public
            $table->boolean('available')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('menu_items');
    }
};
