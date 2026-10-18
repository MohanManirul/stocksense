<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

class ProductPageController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view products', only: ['index', 'show']),
            new Middleware('permission:create products', only: ['create']),
            new Middleware('permission:edit products', only: ['edit']),
        ];
    }

    public function index(): Response
    {
        return Inertia::render('admin/products/index/page');
    }

    public function create(): Response
    {
        return Inertia::render('admin/products/create/page');
    }

    public function show(Product $product): Response
    {
        return Inertia::render('admin/products/show/page', [
            'productId' => $product->id,
        ]);
    }

    public function edit(Product $product): Response
    {
        return Inertia::render('admin/products/edit/page', [
            'productId' => $product->id,
        ]);
    }
}
