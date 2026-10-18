<?php

namespace App\Http\Requests\PurchaseOrder;

use App\Enums\PurchaseOrderStatus;
use App\Http\Requests\IndexRequest;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

class IndexPurchaseOrderRequest extends IndexRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'status' => ['nullable', Rule::enum(PurchaseOrderStatus::class)],
            'supplier' => ['nullable', 'integer'],
        ];
    }
}
