<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

class SalePageController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view sales', only: ['index', 'show']),
            new Middleware('permission:create sales', only: ['create']),
        ];
    }

    public function index(): Response
    {
        return Inertia::render('admin/sales/index/page');
    }

    public function create(): Response
    {
        return Inertia::render('admin/sales/create/page');
    }

    public function show(Sale $sale): Response
    {
        return Inertia::render('admin/sales/show/page', [
            'saleId' => $sale->id,
        ]);
    }
}
