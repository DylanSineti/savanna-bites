<?php

use App\Http\Controllers\BroadcastController;
use App\Http\Controllers\MenuItemController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\WhatsAppController;
use Illuminate\Support\Facades\Route;

// WhatsApp webhook — public (Meta needs to reach this)
Route::get('/webhook',  [WhatsAppController::class, 'verify'])->middleware('tenant');
Route::post('/webhook', [WhatsAppController::class, 'handle'])->middleware('tenant');

// Paynow payment callbacks — public (Paynow needs to reach these)
Route::post('/paynow/result', [PaymentController::class, 'result']);
Route::get('/paynow/return',  [PaymentController::class, 'return']);

// Public storefront + invoice — no auth
Route::get('/store/menu',      [MenuItemController::class, 'publicMenu']);
Route::get('/invoice/{id}',    [OrderController::class, 'invoice']);

// Dashboard API — protected
Route::middleware(['auth:web'])->group(function () {
    Route::post('/orders', [OrderController::class, 'store']);  // ← add this
    Route::get('/orders',           [OrderController::class, 'index']);
    Route::get('/orders/stats',     [OrderController::class, 'stats']);
    Route::get('/orders/pos-queue', [OrderController::class, 'posQueue']);
    Route::patch('/orders/{id}',    [OrderController::class, 'update']);
    Route::get('/orders/{id}/activities', [OrderController::class, 'activities']);
    Route::get('/reviews',                [OrderController::class, 'reviews']);

    Route::get('/team',          [TeamController::class, 'index']);
    Route::post('/team',         [TeamController::class, 'store']);
    Route::patch('/team/{id}',   [TeamController::class, 'update']);
    Route::delete('/team/{id}',  [TeamController::class, 'destroy']);

    Route::get('/menu-items',          [MenuItemController::class, 'index']);
    Route::post('/menu-items',         [MenuItemController::class, 'store']);
    Route::post('/menu-items/{id}',    [MenuItemController::class, 'update']); // POST with _method=PATCH for multipart
    Route::delete('/menu-items/{id}',  [MenuItemController::class, 'destroy']);

    Route::get('/profile',          [ProfileController::class, 'show']);
    Route::patch('/profile',        [ProfileController::class, 'update']);
    Route::patch('/profile/password', [ProfileController::class, 'updatePassword']);

    Route::get('/settings',         [SettingsController::class, 'show']);
    Route::patch('/settings',       [SettingsController::class, 'update']);

    Route::get('/broadcast/recipients', [BroadcastController::class, 'recipients']);
    Route::post('/broadcast/send',      [BroadcastController::class, 'send']);
});
