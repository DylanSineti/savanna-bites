<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MenuItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug',
        'name',
        'category',
        'price',
        'description',
        'emoji',
        'image_path',
        'available',
        'sort_order',
    ];

    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }

    protected $casts = [
        'price'     => 'float',
        'available' => 'boolean',
    ];
}
