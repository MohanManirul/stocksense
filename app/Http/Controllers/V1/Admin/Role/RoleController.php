<?php

namespace App\Http\Controllers\V1\Admin\Role;

use App\Helpers\ApiResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Role\StoreRoleRequest;
use App\Http\Requests\Role\UpdateRoleRequest;
use App\Http\Resources\Role\RoleResource;
use App\Services\Role\RoleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Spatie\Permission\Models\Role;

class RoleController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view roles', only: ['index', 'show', 'permissionGroups']),
            new Middleware('permission:create roles', only: ['store']),
            new Middleware('permission:edit roles', only: ['update']),
            new Middleware('permission:delete roles', only: ['destroy']),
        ];
    }

    public function __construct(
        private readonly RoleService $roleService,
    ) {}

    public function index(): JsonResponse
    {
        return ApiResponseHelper::success(RoleResource::collection($this->roleService->list()));
    }

    public function permissionGroups(): JsonResponse
    {
        return ApiResponseHelper::success($this->roleService->permissionGroups());
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $role = $this->roleService->create($request->validated());

        return ApiResponseHelper::success(new RoleResource($role), 'Role created.', 201);
    }

    public function show(Role $role): JsonResponse
    {
        return ApiResponseHelper::success(new RoleResource($role->load('permissions')));
    }

    public function update(UpdateRoleRequest $request, Role $role): JsonResponse
    {
        $role = $this->roleService->update($role, $request->validated());

        return ApiResponseHelper::success(new RoleResource($role), 'Role updated.');
    }

    public function destroy(Role $role): JsonResponse
    {
        $this->roleService->delete($role);

        return ApiResponseHelper::success(message: 'Role deleted.');
    }
}
