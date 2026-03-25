<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConversationState extends Model
{
    protected $fillable = [
        'phone',
        'state',
        'order_text',
        'cart',
    ];
}