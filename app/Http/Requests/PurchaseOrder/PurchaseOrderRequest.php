<?php

namespace App\Http\Requests\PurchaseOrder;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PurchaseOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'supplier_id' => ['required', 'integer', Rule::exists('suppliers', 'id')],
            'expected_at' => ['nullable', 'date_format:Y-m-d'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('products', 'id')->where('is_active', true)->where('supplier_id', (int) $this->input('supplier_id')),
            ],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:100000'],
            'items.*.unit_cost' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:99999999'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.required' => 'Add at least one product to the order.',
            'items.*.product_id.required' => 'Choose a product.',
            'items.*.product_id.distinct' => 'This product is already in the order.',
            'items.*.product_id.exists' => 'This product is not an active product of the selected supplier.',
            'items.*.quantity.required' => 'Enter a quantity.',
            'items.*.quantity.min' => 'Order at least one unit.',
            'items.*.unit_cost.required' => 'Enter the unit cost.',
            'items.*.unit_cost.decimal' => 'Use at most two decimal places.',
        ];
    }
}
