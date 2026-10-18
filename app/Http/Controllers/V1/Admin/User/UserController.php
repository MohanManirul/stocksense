<?php

namespace App\Http\Controllers\V1\Admin\User;

use App\Helpers\ApiResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\IndexRequest;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\User\UserResource;
use App\Models\User;
use App\Services\User\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class UserController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view users', only: ['index', 'show']),
            new Middleware('permission:create users|edit users', only: ['roleOptions']),
            new Middleware('permission:create users', only: ['store']),
            new Middleware('permission:edit users', only: ['update']),
            new Middleware('permission:delete users', only: ['destroy']),
        ];
    }

    public function __construct(
        private readonly UserService $userService,
    ) {}

    public function index(IndexRequest $request): JsonResponse
    {
        return ApiResponseHelper::paginated(UserResource::collection($this->userService->list($request->validated())));
    }

    public function roleOptions(): JsonResponse
    {
        return ApiResponseHelper::success($this->userService->assignableRoles());
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->userService->create($request->validated());

        return ApiResponseHelper::success(new UserResource($user), 'User created.', 201);
    }

    public function show(User $user): JsonResponse
    {
        return ApiResponseHelper::success(new UserResource($user->load('roles')));
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $user = $this->userService->update($user, $request->validated());

        return ApiResponseHelper::success(new UserResource($user), 'User updated.');
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->userService->delete($user, $request->user());

        return ApiResponseHelper::success(message: 'User deleted.');
    }
}
