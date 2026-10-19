<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

class ForecastPageController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view forecasts'),
        ];
    }

    public function index(): Response
    {
        return Inertia::render('admin/forecasts/index/page');
    }

    public function show(Product $product): Response
    {
        return Inertia::render('admin/forecasts/show/page', [
            'productId' => $product->id,
        ]);
    }
}
