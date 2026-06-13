<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BestsellerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PriceHistoryController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\PointController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ShipmentController;
use Illuminate\Support\Facades\Route;

// 公开路由（无需认证）
Route::post('login', [AuthController::class, 'login']);
Route::post('logout', [AuthController::class, 'logout']);

// 需要认证的路由（Session 认证）
Route::middleware(['auth:web'])->group(function () {
    Route::get('me', [AuthController::class, 'me']);
    Route::get('/', [DashboardController::class, 'index']);
    Route::get('bestsellers', [BestsellerController::class, 'index']);
Route::get('products', [ProductController::class, 'index']);
Route::get('products/create', [ProductController::class, 'create']);
Route::post('products', [ProductController::class, 'store']);
Route::get('products/{id}', [ProductController::class, 'show']);
Route::get('products/{id}/edit', [ProductController::class, 'edit']);
Route::put('products/{id}', [ProductController::class, 'update']);
Route::delete('products/{id}', [ProductController::class, 'destroy']);

Route::get('categories', [CategoryController::class, 'index']);
Route::get('categories/create', [CategoryController::class, 'create']);
Route::post('categories', [CategoryController::class, 'store']);
Route::get('categories/{id}/edit', [CategoryController::class, 'edit']);
Route::put('categories/{id}', [CategoryController::class, 'update']);
Route::delete('categories/{id}', [CategoryController::class, 'destroy']);

Route::get('tags', [TagController::class, 'index']);
Route::get('tags/all', [TagController::class, 'all']);
Route::get('tags/for-select', [TagController::class, 'forSelect']);
Route::post('tags/find-or-create', [TagController::class, 'findOrCreate']);
Route::get('tags/create', [TagController::class, 'create']);
Route::post('tags', [TagController::class, 'store']);
Route::get('tags/{id}/edit', [TagController::class, 'edit']);
Route::put('tags/{id}', [TagController::class, 'update']);
Route::delete('tags/{id}', [TagController::class, 'destroy']);

Route::get('orders', [OrderController::class, 'index']);
Route::get('orders/create', [OrderController::class, 'create']);
Route::post('orders', [OrderController::class, 'store']);
Route::get('orders/{id}', [OrderController::class, 'show']);
Route::patch('orders/{order}/status', [OrderController::class, 'updateStatus']);

Route::get('inventory', [InventoryController::class, 'index']);
Route::get('inventory/{product}/adjust', [InventoryController::class, 'adjust']);
Route::post('inventory/{product}/adjust', [InventoryController::class, 'doAdjust']);

Route::get('points', [PointController::class, 'index']);
Route::get('points/{account}', [PointController::class, 'show']);
Route::post('points/{account}/adjust', [PointController::class, 'adjust']);
Route::get('points/user/{user}', [PointController::class, 'showByUser']);
Route::post('points/user/{user}/adjust', [PointController::class, 'adjustByUser']);
Route::get('points/ranking', [PointController::class, 'ranking']);

Route::get('users', [UserController::class, 'index']);
Route::get('users/{id}', [UserController::class, 'show']);

Route::get('price-histories', [PriceHistoryController::class, 'index']);
Route::get('price-histories/product/{productId}', [PriceHistoryController::class, 'byProduct']);
Route::get('price-histories/chart/{productId}', [PriceHistoryController::class, 'chart']);
Route::post('price-histories/preview', [PriceHistoryController::class, 'preview']);
Route::post('price-histories/batch-update', [PriceHistoryController::class, 'batchUpdate']);

Route::get('shipments', [ShipmentController::class, 'index']);
Route::get('shipments/create/order/{order}', [ShipmentController::class, 'create']);
Route::post('shipments/order/{order}', [ShipmentController::class, 'store']);
Route::get('shipments/{id}', [ShipmentController::class, 'show']);
Route::post('shipments/{shipment}/tracks', [ShipmentController::class, 'addTrack']);
Route::patch('shipments/{shipment}/status', [ShipmentController::class, 'updateStatus']);
Route::get('shipments/order/{order}', [ShipmentController::class, 'byOrder']);
});
