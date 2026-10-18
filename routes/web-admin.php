<?php

use App\Http\Controllers\Auth\AuthController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('guest:web')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
});

Route::middleware('auth:sanctum')->group(function () {
    Route::redirect('/', '/admin/dashboard')->name('admin.index');

    Route::get('/dashboard', fn () => Inertia::render('admin/dashboard/page'))->name('dashboard');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
});
