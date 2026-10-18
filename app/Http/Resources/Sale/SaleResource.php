<?php

namespace App\Http\Resources\Sale;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SaleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'customer_name' => $this->customer_name,
            'notes' => $this->notes,
            'total' => $this->total,
            'sold_at' => $this->sold_at,
            'items_count' => $this->whenCounted('items'),
            'user' => $this->whenLoaded('user', fn () => $this->user->only(['id', 'name'])),
            'items' => SaleItemResource::collection($this->whenLoaded('items')),
        ];
    }
}
