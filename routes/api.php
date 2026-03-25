<?php

use App\Http\Controllers\MenuItemController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\WhatsAppController;
use Illuminate\Support\Facades\Route;

// WhatsApp webhook — public (Meta needs to reach this)
Route::get('/webhook',  [WhatsAppController::class, 'verify']);
Route::post('/webhook', [WhatsAppController::class, 'handle']);

// Dashboard API — protected
Route::middleware(['auth:web'])->group(function () {
    Route::post('/orders', [OrderController::class, 'store']);  // ← add this
    Route::get('/orders',           [OrderController::class, 'index']);
    Route::get('/orders/stats',     [OrderController::class, 'stats']);
    Route::patch('/orders/{id}',    [OrderController::class, 'update']);

    Route::get('/menu-items',          [MenuItemController::class, 'index']);
    Route::post('/menu-items',         [MenuItemController::class, 'store']);
    Route::post('/menu-items/{id}',    [MenuItemController::class, 'update']); // POST with _method=PATCH for multipart
    Route::delete('/menu-items/{id}',  [MenuItemController::class, 'destroy']);

    Route::get('/profile',          [ProfileController::class, 'show']);
    Route::patch('/profile',        [ProfileController::class, 'update']);
    Route::patch('/profile/password', [ProfileController::class, 'updatePassword']);

    Route::get('/settings',         [SettingsController::class, 'show']);
    Route::patch('/settings',       [SettingsController::class, 'update']);
});
