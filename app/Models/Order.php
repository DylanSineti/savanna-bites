<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @mixin \Illuminate\Database\Eloquent\Model
 */
class Order extends Model
{
    protected $fillable = [
        'phone',
        'order_text',
        'total',
        'amount_paid',
        'assigned_to',
        'status',
        'order_type',
        'payment_status',
        'payment_method',
        'payment_reference',
        'payment_url',
        'rating',
        'review',
        'review_sent',
    ];

    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function assignedMember()
    {
        return $this->belongsTo(TeamMember::class, 'assigned_to');
    }
}
