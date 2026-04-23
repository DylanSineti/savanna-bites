<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @mixin \Illuminate\Database\Eloquent\Model
 */
class OrderActivity extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'order_id',
        'field',
        'old_value',
        'new_value',
        'changed_by',
        'note',
        'created_at',
    ];

    protected $appends = ['description'];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function getDescriptionAttribute(): string
    {
        $labels = [
            'status'         => 'Order status',
            'payment_status' => 'Payment status',
            'amount_paid'    => 'Cash collected',
            'assigned_to'    => 'Assigned to',
        ];

        $label = $labels[$this->field] ?? ucfirst(str_replace('_', ' ', $this->field));

        if ($this->field === 'amount_paid') {
            $old = number_format((float) $this->old_value, 2);
            $new = number_format((float) $this->new_value, 2);
            return "Cash collected: \${$new} (was \${$old})";
        }

        if ($this->old_value !== null && $this->old_value !== '') {
            return "{$label} changed: {$this->old_value} → {$this->new_value}";
        }

        return "{$label} set to {$this->new_value}";
    }
}
