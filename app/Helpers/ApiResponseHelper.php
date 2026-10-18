<?php

namespace App\Helpers;

use Illuminate\Http\JsonResponse;

final class ApiResponseHelper
{
    public static function success(mixed $data = null, string $message = 'Success', int $status = 200): JsonResponse
    {
        return response()->json([
            'message' => $message,
            'data' => $data,
        ], $status);
    }
}
