<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BestsellerController extends Controller
{
    const STOCK_LOW_THRESHOLD = 10;

    public function index(Request $request)
    {
        try {
            $preset = $request->query('preset', '7d');
            $dateFrom = $request->query('date_from');
            $dateTo = $request->query('date_to');
            $sortBy = $request->query('sort_by', 'quantity');
            $limit = (int) $request->query('limit', 10);

            if (!in_array($limit, [10, 20, 50], true)) {
                $limit = 10;
            }

            if (!in_array($sortBy, ['quantity', 'amount'], true)) {
                $sortBy = 'quantity';
            }

            if ($preset === 'custom' && $dateFrom && $dateTo) {
                $startDate = $dateFrom . ' 00:00:00';
                $endDate = $dateTo . ' 23:59:59';
            } elseif ($preset === '30d') {
                $startDate = now()->subDays(29)->startOfDay()->format('Y-m-d H:i:s');
                $endDate = now()->endOfDay()->format('Y-m-d H:i:s');
            } else {
                $startDate = now()->subDays(6)->startOfDay()->format('Y-m-d H:i:s');
                $endDate = now()->endOfDay()->format('Y-m-d H:i:s');
            }

            $revenueStatuses = [Order::STATUS_PAID, Order::STATUS_SHIPPED];

            $rows = OrderItem::query()
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->leftJoin('products', 'order_items.product_id', '=', 'products.id')
                ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
                ->whereIn('orders.status', $revenueStatuses)
                ->whereBetween('orders.created_at', [$startDate, $endDate])
                ->groupBy(
                    'order_items.product_id',
                    'order_items.product_name',
                    'products.sku',
                    'products.stock',
                    'products.name',
                    'categories.name'
                )
                ->selectRaw("
                    order_items.product_id,
                    order_items.product_name AS snapshot_name,
                    COALESCE(products.name, order_items.product_name) AS product_name,
                    COALESCE(products.sku, '') AS sku,
                    COALESCE(categories.name, '') AS category_name,
                    COALESCE(products.stock, 0) AS current_stock,
                    SUM(order_items.quantity) AS total_quantity,
                    SUM(order_items.subtotal) AS total_amount
                ")
                ->orderByDesc($sortBy === 'amount' ? 'total_amount' : 'total_quantity')
                ->limit($limit)
                ->get();

            $list = $rows->map(function ($row, $index) {
                return [
                    'rank' => $index + 1,
                    'product_id' => (int) $row->product_id,
                    'product_name' => $row->product_name,
                    'sku' => $row->sku,
                    'category_name' => $row->category_name,
                    'total_quantity' => (int) $row->total_quantity,
                    'total_amount' => round((float) $row->total_amount, 2),
                    'current_stock' => (int) $row->current_stock,
                    'low_stock' => ((int) $row->current_stock) <= self::STOCK_LOW_THRESHOLD,
                ];
            })->values()->toArray();

            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'data' => $list,
                    'meta' => [
                        'preset' => $preset,
                        'date_from' => $startDate,
                        'date_to' => $endDate,
                        'sort_by' => $sortBy,
                        'limit' => $limit,
                        'stock_threshold' => self::STOCK_LOW_THRESHOLD,
                    ],
                ]);
            }

            return view('bestsellers.index', ['bestsellers' => $list, 'meta' => compact('preset', 'sortBy', 'limit')]);
        } catch (\Exception $e) {
            Log::error('BestsellerController@index', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'error' => '服务器错误',
                    'message' => $e->getMessage(),
                ], 500);
            }
            throw $e;
        }
    }
}
