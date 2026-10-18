<?php

namespace App\Http\Resources\Product;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'name' => $this->name,
            'description' => $this->description,
            'category_id' => $this->category_id,
            'supplier_id' => $this->supplier_id,
            'category' => $this->whenLoaded('category', fn () => $this->category->only(['id', 'name'])),
            'supplier' => $this->whenLoaded('supplier', fn () => $this->supplier?->only(['id', 'name', 'lead_time_days'])),
            'cost_price' => $this->cost_price,
            'sale_price' => $this->sale_price,
            'stock_on_hand' => $this->stock_on_hand,
            'reorder_level' => $this->reorder_level,
            'is_active' => $this->is_active,
            'on_order' => $this->whenHas('on_order'),
            'updated_at' => $this->updated_at,
        ];
    }
}
