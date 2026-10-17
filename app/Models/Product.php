<?php

namespace App\Models;

use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'supplier_id',
        'sku',
        'name',
        'description',
        'cost_price',
        'sale_price',
        'stock_on_hand',
        'reorder_level',
        'is_active',
    ];  

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected function casts():array
    {
        return[
            'cost_price' => 'decimal:2',
            'sale_price' => 'decimal:2',
             'stock_on_hand' => 'integer',
             'reorder_level' => 'integer'

        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }


    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function purchaseOrderItems(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function purchaseInvoiceItems(): HasMany
    {
        return $this->hasMany(PurchaseInvoiceItem::class);
    }   

    protected function active(Builder $query): void
    {
        $query->where('is_active', true);
    }

    protected function search(Builder $query, string $term): void
    {
        $query->when($term, fn (Builder $query) => $query->where(function (Builder $query) use ($term) {
            $query->whereLike('name', "%{$term}%", caseSensitive: false)
                ->orWhereLike('sku', "%{$term}%", caseSensitive: false);
        }));
    }   

}
