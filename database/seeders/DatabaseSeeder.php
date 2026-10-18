<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@stocksense.test'],
            ['name' => 'Shop Admin', 'role' => UserRole::Owner, 'password' => 'password'],
        );

        User::updateOrCreate(
            ['email' => 'staff@stocksense.test'],
            ['name' => 'Shop Staff', 'role' => UserRole::Staff, 'password' => 'password'],
        );
    }
}
