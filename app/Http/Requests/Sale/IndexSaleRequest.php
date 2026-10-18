<?php

namespace App\Http\Requests\Sale;

use App\Http\Requests\IndexRequest;
use Illuminate\Contracts\Validation\ValidationRule;

class IndexSaleRequest extends IndexRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
        ];
    }
}
