<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('restaurants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('tagline')->nullable();

            // WhatsApp Business credentials (Meta)
            $table->string('whatsapp_phone_id')->unique();
            $table->text('whatsapp_token');
            $table->string('verify_token', 64)->unique();

            // Admin & contact details
            $table->string('admin_whatsapp')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('business_hours')->default('Mon–Sun 9am–9pm');

            // Paynow credentials (optional — cash-only restaurants leave blank)
            $table->string('paynow_integration_id')->nullable();
            $table->text('paynow_integration_key')->nullable();
            $table->string('paynow_auth_email')->nullable();

            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurants');
    }
};
