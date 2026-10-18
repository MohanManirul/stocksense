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
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->string('type', 20);
            $table->integer('quantity');
            $table->integer('balance_after');
            $table->nullableMorphs('reference');
            $table->string('note')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['product_id', 'occurred_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
