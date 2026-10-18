<?php

namespace Tests;

use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Spatie\Permission\Models\Role;

abstract class TestCase extends BaseTestCase
{
    protected bool $seed = true;

    protected string $seeder = RoleSeeder::class;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('admin', 'web')->syncPermissions(config('admin-permissions.permissions'));
        Role::findOrCreate('staff', 'web')->syncPermissions(['view categories', 'view suppliers']);
    }
}
