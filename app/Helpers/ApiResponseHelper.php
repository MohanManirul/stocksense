<?php

namespace App\Helpers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\ResourceCollection;

final class ApiResponseHelper
{
    public static function success(mixed $data = null, string $message = 'Success', int $status = 200): JsonResponse
    {
        return response()->json([
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    public static function paginated(ResourceCollection $collection, string $message = 'Success'): JsonResponse
    {
        return $collection->additional(['message' => $message])->response();
    }
}
