<?php

namespace App\Http\Resources\Stock;

use App\Models\PurchaseOrder;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockMovementResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'type_label' => $this->type->label(),
            'quantity' => $this->quantity,
            'balance_after' => $this->balance_after,
            'note' => $this->note,
            'occurred_at' => $this->occurred_at,
            'user' => $this->whenLoaded('user', fn () => $this->user?->only(['id', 'name'])),
            'reference' => $this->whenLoaded('reference', fn () => match (true) {
                $this->reference instanceof Sale => ['type' => 'sale', 'id' => $this->reference->id, 'number' => $this->reference->number],
                $this->reference instanceof PurchaseOrder => ['type' => 'purchase_order', 'id' => $this->reference->id, 'number' => $this->reference->number],
                default => null,
            }),
        ];
    }
}
