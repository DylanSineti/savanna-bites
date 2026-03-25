<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'phone',
        'order_text',
        'total',
        'status',
        'rating',
        'review',
        'review_sent',
    ];
}
