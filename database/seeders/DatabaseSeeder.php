<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use App\Services\Product\ProductService;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(ProductService $productService): void
    {
        $this->call(RoleSeeder::class);

        $owner = User::firstOrCreate(
            ['email' => 'admin@stocksense.test'],
            ['name' => 'Shop Owner', 'password' => 'password'],
        );
        $owner->assignRole(UserRole::SuperAdmin->value);

        $categories = collect(['Beverages', 'Snacks', 'Dairy', 'Household', 'Personal Care', 'Stationery'])
            ->mapWithKeys(fn (string $name) => [$name => Category::firstOrCreate(['name' => $name])->id]);

        $suppliers = collect([
            ['name' => 'FreshFlow Distributors', 'contact_name' => 'Rahim Uddin', 'email' => 'orders@freshflow.test', 'phone' => '01711-000001', 'lead_time_days' => 3],
            ['name' => 'Prime Wholesale', 'contact_name' => 'Karim Hossain', 'email' => 'sales@primewholesale.test', 'phone' => '01711-000002', 'lead_time_days' => 5],
            ['name' => 'CleanHome Supplies', 'contact_name' => 'Nasrin Akter', 'email' => 'hello@cleanhome.test', 'phone' => '01711-000003', 'lead_time_days' => 7],
            ['name' => 'PaperPoint Traders', 'contact_name' => 'Sohel Rana', 'email' => 'info@paperpoint.test', 'phone' => '01711-000004', 'lead_time_days' => 10],
        ])->mapWithKeys(fn (array $supplier) => [$supplier['name'] => Supplier::firstOrCreate(['name' => $supplier['name']], $supplier)->id]);

        $products = [
            ['BEV-001', 'Mineral Water 1.5L', 'Beverages', 'FreshFlow Distributors', 18, 25, 24, 120],
            ['BEV-002', 'Mango Juice 1L', 'Beverages', 'FreshFlow Distributors', 95, 130, 12, 8],
            ['SNK-001', 'Potato Chips 100g', 'Snacks', 'Prime Wholesale', 35, 50, 20, 64],
            ['SNK-002', 'Chocolate Biscuits 200g', 'Snacks', 'Prime Wholesale', 55, 80, 15, 0],
            ['DRY-001', 'Full Cream Milk 1L', 'Dairy', 'FreshFlow Distributors', 90, 110, 18, 30],
            ['HOU-001', 'Dishwashing Liquid 500ml', 'Household', 'CleanHome Supplies', 120, 165, 10, 6],
            ['PER-001', 'Herbal Shampoo 340ml', 'Personal Care', 'CleanHome Supplies', 260, 340, 8, 22],
            ['STA-001', 'A4 Exercise Book', 'Stationery', 'PaperPoint Traders', 40, 60, 25, 75],
        ];

        foreach ($products as [$sku, $name, $category, $supplier, $cost, $price, $reorderLevel, $openingStock]) {
            if (Product::where('sku', $sku)->exists()) {
                continue;
            }

            $productService->create([
                'sku' => $sku,
                'name' => $name,
                'description' => null,
                'category_id' => $categories[$category],
                'supplier_id' => $suppliers[$supplier],
                'cost_price' => $cost,
                'sale_price' => $price,
                'reorder_level' => $reorderLevel,
                'is_active' => true,
                'opening_stock' => $openingStock,
            ], $owner);
        }
    }
}
