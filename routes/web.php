<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Public pages — no login required
Route::get('/store',           fn() => Inertia::render('Store'));
Route::get('/invoice/{id}',    fn() => Inertia::render('Invoice', ['id' => request()->route('id')]));

Route::get('/', fn() => Inertia::render('Landing'));

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard',   fn() => Inertia::render('Dashboard'))->name('dashboard');
    Route::get('/menu',        fn() => Inertia::render('Menu'));
    Route::get('/customers',   fn() => Inertia::render('Customers'));
    Route::get('/analytics',   fn() => Inertia::render('Analytics'));
    Route::get('/profile',     fn() => Inertia::render('Profile'));
    Route::get('/settings',    fn() => Inertia::render('Settings'));
    Route::get('/pos',         fn() => Inertia::render('POS'))->name('pos');
    Route::get('/team',        fn() => Inertia::render('Team'));
    Route::get('/broadcast',   fn() => Inertia::render('Broadcast'));
    Route::get('/reviews',     fn() => Inertia::render('Reviews'));
});

require __DIR__ . '/auth.php';
