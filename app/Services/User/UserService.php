<?php

namespace App\Services\User;

use App\Enums\UserRole;
use App\Models\PurchaseOrder;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

final class UserService
{
    /**
     * @param  array{search?: string|null, per_page?: int|null}  $filters
     * @return LengthAwarePaginator<int, User>
     */
    public function list(array $filters): LengthAwarePaginator
    {
        return User::with('roles:id,name')
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where(function (Builder $query) use ($search) {
                $query->whereLike('name', "%{$search}%", caseSensitive: false)
                    ->orWhereLike('email', "%{$search}%", caseSensitive: false);
            }))
            ->orderBy('name')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();
    }

    /**
     * @return Collection<int, string>
     */
    public function assignableRoles(): Collection
    {
        return Role::where('name', '!=', UserRole::SuperAdmin->value)->orderBy('name')->pluck('name');
    }

    /**
     * @param  array{name: string, email: string, password: string, role: string}  $data
     */
    public function create(array $data): User
    {
        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
            ]);

            $user->syncRoles($data['role']);

            return $user->load('roles');
        });
    }

    /**
     * @param  array{name: string, email: string, password?: string|null, role: string}  $data
     */
    public function update(User $user, array $data): User
    {
        $this->ensureNotProtected($user);

        return DB::transaction(function () use ($user, $data) {
            $user->fill([
                'name' => $data['name'],
                'email' => $data['email'],
            ]);

            if (! empty($data['password'])) {
                $user->password = $data['password'];
            }

            $user->save();
            $user->syncRoles($data['role']);

            return $user->load('roles');
        });
    }

    public function delete(User $user, User $actor): void
    {
        if ($user->is($actor)) {
            throw ValidationException::withMessages([
                'user' => 'You cannot delete your own account.',
            ]);
        }

        $this->ensureNotProtected($user);

        $hasHistory = Sale::where('user_id', $user->id)->exists()
            || PurchaseOrder::where('created_by', $user->id)->orWhere('received_by', $user->id)->exists()
            || StockMovement::where('user_id', $user->id)->exists();

        if ($hasHistory) {
            throw ValidationException::withMessages([
                'user' => 'This user has sales, purchase orders or stock changes on record and cannot be deleted.',
            ]);
        }

        $user->delete();
    }

    private function ensureNotProtected(User $user): void
    {
        if ($user->isSuperAdmin()) {
            throw new AuthorizationException('The super admin account cannot be changed.');
        }
    }
}
