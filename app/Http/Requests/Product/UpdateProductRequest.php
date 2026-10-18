<?php

namespace App\Http\Requests\Product;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
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
            'sku' => ['required', 'string', 'max:50', 'regex:/^[A-Z0-9\-_.]+$/', Rule::unique('products', 'sku')->ignore($this->route('product'))],
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:2000'],
            'category_id' => ['required', 'integer', Rule::exists('categories', 'id')],
            'supplier_id' => ['nullable', 'integer', Rule::exists('suppliers', 'id')],
            'cost_price' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:99999999'],
            'sale_price' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:99999999'],
            'reorder_level' => ['required', 'integer', 'min:0', 'max:1000000'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'sku.regex' => 'Use capital letters, numbers, dashes, dots or underscores only.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['sku' => strtoupper(trim((string) $this->input('sku')))]);
    }
}
