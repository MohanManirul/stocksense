<?php

namespace App\Http\Resources\PurchaseOrder;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseOrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'status' => $this->status,
            'status_label' => $this->status->label(),
            'supplier_id' => $this->supplier_id,
            'supplier' => $this->whenLoaded('supplier', fn () => $this->supplier->only(['id', 'name', 'lead_time_days'])),
            'creator' => $this->whenLoaded('creator', fn () => $this->creator->only(['id', 'name'])),
            'receiver' => $this->whenLoaded('receiver', fn () => $this->receiver?->only(['id', 'name'])),
            'total' => $this->total,
            'expected_at' => $this->expected_at?->toDateString(),
            'ordered_at' => $this->ordered_at,
            'received_at' => $this->received_at,
            'cancelled_at' => $this->cancelled_at,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'items_count' => $this->whenCounted('items'),
            'items' => PurchaseOrderItemResource::collection($this->whenLoaded('items')),
        ];
    }
}
