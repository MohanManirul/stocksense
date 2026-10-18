<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrder extends Model
{
    protected $fillable = [
        'supplier_id',
        'total_amount',
        'status',
        'expected_at',
        'ordered_at',
        'received_at',
        'cancelled_at',
        'notes'
    ];

    protected $attributes = [
        'status' => 'draft',
    ];

    protected function casts(): array
    {
        return [
            'status' => PurchaseOrderStatus::class,
            'total_amount' => 'decimal:2',
            'expected_at' => 'date',
            'ordered_at' => 'datetime',
            'received_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    protected function number():Attribute
    {
        return Attribute::make(
            get: fn ($value) => str_pad($value, 6, '0', STR_PAD_LEFT),
        );
    }

    public function supplier():BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function creator():BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items():HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function isDraft():bool
    {
        return $this->status === PurchaseOrderStatus::DRAFT;
    }


}
