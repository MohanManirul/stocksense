<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    public function definition(): array
    {
        $cost = fake()->randomFloat(2, 10, 500);

        return [
            'category_id' => Category::factory(),
            'supplier_id' => Supplier::factory(),
            'sku' => strtoupper(fake()->unique()->bothify('???-####')),
            'name' => ucfirst(fake()->words(3, true)),
            'description' => fake()->sentence(),
            'cost_price' => $cost,
            'sale_price' => round($cost * 1.4, 2),
            'reorder_level' => fake()->numberBetween(5, 20),
            'is_active' => true,
        ];
    }

    public function withStock(int $quantity): static
    {
        return $this->afterMaking(fn (Product $product) => $product->forceFill(['stock_on_hand' => $quantity]));
    }
}
