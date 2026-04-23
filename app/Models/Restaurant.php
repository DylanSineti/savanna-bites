<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Restaurant extends Model
{
    protected $fillable = [
        'name',
        'tagline',
        'whatsapp_phone_id',
        'whatsapp_token',
        'verify_token',
        'admin_whatsapp',
        'contact_phone',
        'business_hours',
        'paynow_integration_id',
        'paynow_integration_key',
        'paynow_auth_email',
        'is_active',
    ];

    protected $hidden = [
        'whatsapp_token',
        'paynow_integration_key',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // ─── Relations ─────────────────────────────────────────────────────────────

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function menuItems()
    {
        return $this->hasMany(MenuItem::class);
    }

    public function teamMembers()
    {
        return $this->hasMany(TeamMember::class);
    }

    public function conversationStates()
    {
        return $this->hasMany(ConversationState::class);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    /** Generate a secure unique verify token. */
    public static function generateVerifyToken(): string
    {
        do {
            $token = Str::random(32);
        } while (static::where('verify_token', $token)->exists());

        return $token;
    }
}
