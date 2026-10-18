<?php

namespace App\Services\Role;

use App\Enums\UserRole;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

final class RoleService
{
    /**
     * @return Collection<int, Role>
     */
    public function list(): Collection
    {
        return Role::withCount(['permissions', 'users'])->orderBy('name')->get();
    }

    /**
     * @return SupportCollection<int, array{module: string, permissions: SupportCollection<int, string>}>
     */
    public function permissionGroups(): SupportCollection
    {
        return Permission::where('guard_name', 'web')
            ->orderBy('id')
            ->pluck('name')
            ->groupBy(fn (string $name) => Str::after($name, ' '))
            ->map(fn (SupportCollection $permissions, string $module) => [
                'module' => $module,
                'permissions' => $permissions->values(),
            ])
            ->values();
    }

    /**
     * @param  array{name: string, permissions?: array<int, string>}  $data
     */
    public function create(array $data): Role
    {
        return DB::transaction(function () use ($data) {
            $role = Role::create(['name' => $data['name'], 'guard_name' => 'web']);
            $role->syncPermissions($data['permissions'] ?? []);

            return $role->load('permissions');
        });
    }

    /**
     * @param  array{name: string, permissions?: array<int, string>}  $data
     */
    public function update(Role $role, array $data): Role
    {
        $this->ensureNotProtected($role);

        return DB::transaction(function () use ($role, $data) {
            $role->update(['name' => $data['name']]);
            $role->syncPermissions($data['permissions'] ?? []);

            return $role->load('permissions');
        });
    }

    public function delete(Role $role): void
    {
        $this->ensureNotProtected($role);

        if ($role->users()->exists()) {
            throw ValidationException::withMessages([
                'role' => 'Move the users with this role to another role first.',
            ]);
        }

        $role->delete();
    }

    private function ensureNotProtected(Role $role): void
    {
        if ($role->name === UserRole::SuperAdmin->value) {
            throw new AuthorizationException('The super admin role cannot be changed.');
        }
    }
}
