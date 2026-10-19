<?php

use Illuminate\Support\Facades\Route;

use Illuminate\Support\Facades\Artisan;

Route::get('/clear', function () {
    Artisan::call('optimize:clear');
    Artisan::call('storage:link');
    return 'Cache cleared, and storage link completed successfully!';
});


Route::get('/migrate-seed', function () {
    Artisan::call('optimize:clear');

    Artisan::call('migrate');
    
    Artisan::call('db:seed');

    Artisan::call('storage:link');

    return 'Cache cleared, migration, seeder and storage link completed successfully!';
});

Route::redirect('/', '/admin/dashboard');
