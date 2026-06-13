<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\BestsellerController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\PointController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

Route::get('bestsellers', [BestsellerController::class, 'index'])->name('bestsellers.index');

Route::resource('products', ProductController::class);
Route::resource('categories', CategoryController::class)->except(['show']);
Route::resource('tags', TagController::class)->except(['show']);

Route::resource('orders', OrderController::class)->except(['edit', 'update']);
Route::patch('orders/{order}/status', [OrderController::class, 'updateStatus'])->name('orders.updateStatus');

Route::get('inventory', [InventoryController::class, 'index'])->name('inventory.index');
Route::get('inventory/{product}/adjust', [InventoryController::class, 'adjust'])->name('inventory.adjust');
Route::post('inventory/{product}/adjust', [InventoryController::class, 'doAdjust'])->name('inventory.doAdjust');

Route::get('points', [PointController::class, 'index'])->name('points.index');
Route::get('points/{account}', [PointController::class, 'show'])->name('points.show');
Route::post('points/{account}/adjust', [PointController::class, 'adjust'])->name('points.adjust');
Route::get('points/user/{user}', [PointController::class, 'showByUser'])->name('points.showByUser');
Route::post('points/user/{user}/adjust', [PointController::class, 'adjustByUser'])->name('points.adjustByUser');
Route::get('points/ranking', [PointController::class, 'ranking'])->name('points.ranking');

Route::get('users', [UserController::class, 'index'])->name('users.index');
Route::get('users/{user}', [UserController::class, 'show'])->name('users.show');
