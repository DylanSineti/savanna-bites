<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @mixin \Illuminate\Database\Eloquent\Model
 */
class TeamMember extends Model
{
    protected $fillable = [
        'name',
        'phone',
        'role',
        'is_active',
        'note',
    ];

    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
