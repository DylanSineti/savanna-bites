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
        Schema::table('orders', function (Blueprint $table) {
            // Track partial / instalment payments
            $table->decimal('amount_paid', 8, 2)->default(0)->after('total');
            // Track which team member is assigned to deliver the order
            $table->unsignedBigInteger('assigned_to')->nullable()->after('amount_paid');
            $table->foreign('assigned_to')->references('id')->on('team_members')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['assigned_to']);
            $table->dropColumn(['amount_paid', 'assigned_to']);
        });
    }
};
