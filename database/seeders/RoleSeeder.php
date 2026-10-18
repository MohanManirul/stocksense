<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(PermissionSeeder::class);

        Role::findOrCreate(UserRole::SuperAdmin->value, 'web');

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
