<?php

namespace App\Http\Requests\Product;

use Illuminate\Contracts\Validation\ValidationRule;

class StoreProductRequest extends UpdateProductRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'opening_stock' => ['required', 'integer', 'min:0', 'max:1000000'],
        ];
    }
}
