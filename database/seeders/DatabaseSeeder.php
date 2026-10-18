<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call(RoleSeeder::class);

        $accounts = [
            ['email' => 'admin@stocksense.test', 'name' => 'Shop Owner', 'role' => UserRole::SuperAdmin],
            ['email' => 'manager@stocksense.test', 'name' => 'Shop Manager', 'role' => UserRole::Admin],
            ['email' => 'staff@stocksense.test', 'name' => 'Shop Staff', 'role' => UserRole::Staff],
        ];

        foreach ($accounts as $account) {
            User::updateOrCreate(
                ['email' => $account['email']],
                ['name' => $account['name'], 'password' => 'password'],
            )->syncRoles($account['role']->value);
        }

        foreach (['Beverages', 'Snacks', 'Dairy', 'Household', 'Personal Care', 'Stationery'] as $name) {
            Category::firstOrCreate(['name' => $name]);
        }

        $suppliers = [
            ['name' => 'FreshFlow Distributors', 'contact_name' => 'Rahim Uddin', 'email' => 'orders@freshflow.test', 'phone' => '01711-000001', 'lead_time_days' => 3],
            ['name' => 'Prime Wholesale', 'contact_name' => 'Karim Hossain', 'email' => 'sales@primewholesale.test', 'phone' => '01711-000002', 'lead_time_days' => 5],
            ['name' => 'CleanHome Supplies', 'contact_name' => 'Nasrin Akter', 'email' => 'hello@cleanhome.test', 'phone' => '01711-000003', 'lead_time_days' => 7],
            ['name' => 'PaperPoint Traders', 'contact_name' => 'Sohel Rana', 'email' => 'info@paperpoint.test', 'phone' => '01711-000004', 'lead_time_days' => 10],
        ];

        foreach ($suppliers as $supplier) {
            Supplier::firstOrCreate(['name' => $supplier['name']], $supplier);
        }
    }
}
