<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class SupplierPageController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/suppliers/index/page');
    }

    public function create(): Response
    {
        Gate::authorize('create', Supplier::class);

        return Inertia::render('admin/suppliers/create/page');
    }

    public function edit(Supplier $supplier): Response
    {
        Gate::authorize('update', $supplier);

        return Inertia::render('admin/suppliers/edit/page', [
            'supplierId' => $supplier->id,
        ]);
    }
}
