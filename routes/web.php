<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn() => redirect('/dashboard'));

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard',  fn() => Inertia::render('Dashboard'))->name('dashboard');
    Route::get('/menu',       fn() => Inertia::render('Menu'));
    Route::get('/customers',  fn() => Inertia::render('Customers'));
    Route::get('/analytics',  fn() => Inertia::render('Analytics'));
    Route::get('/profile',    fn() => Inertia::render('Profile'));
    Route::get('/settings',   fn() => Inertia::render('Settings'));
    Route::get('/pos', fn() => Inertia::render('POS'))->name('pos');
});

require __DIR__ . '/auth.php';
