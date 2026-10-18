<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

class SupplierPageController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view suppliers', only: ['index']),
            new Middleware('permission:create suppliers', only: ['create']),
            new Middleware('permission:edit suppliers', only: ['edit']),
        ];
    }

    public function index(): Response
    {
        return Inertia::render('admin/suppliers/index/page');
    }

    public function create(): Response
    {
        return Inertia::render('admin/suppliers/create/page');
    }

    public function edit(Supplier $supplier): Response
    {
        return Inertia::render('admin/suppliers/edit/page', [
            'supplierId' => $supplier->id,
        ]);
    }
}
