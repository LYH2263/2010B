<?php

namespace App\Http\Controllers;

use App\Http\Requests\StockTakeCreateRequest;
use App\Http\Requests\StockTakeItemUpdateRequest;
use App\Services\StockTakeService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class StockTakeController extends Controller
{
    public function __construct(
        private StockTakeService $stockTakeService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->query('per_page', 15), 50);
        $filters = [];

        $status = $request->query('status');
        if (is_string($status) && trim($status) !== '') {
            $filters['status'] = trim($status);
        }

        $keyword = $request->query('keyword');
        if (is_string($keyword) && trim($keyword) !== '') {
            $filters['keyword'] = trim($keyword);
        }

        $stockTakes = $this->stockTakeService->list($perPage, ['filters' => $filters]);
        $stats = $this->stockTakeService->stats();

        return response()->json([
            'stock_takes' => $stockTakes,
            'stats' => $stats,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $stockTake = $this->stockTakeService->detail($id);
        return response()->json($stockTake);
    }

    public function store(StockTakeCreateRequest $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $remark = $request->input('remark', '');
            $stockTake = $this->stockTakeService->create($user, $remark);
            return response()->json($stockTake, 201);
        } catch (\Throwable $e) {
            Log::error('StockTakeController@store', ['error' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function updateItem(StockTakeItemUpdateRequest $request, int $stockTakeId, int $itemId): JsonResponse
    {
        try {
            $actualQuantity = $request->input('actual_quantity');
            $item = $this->stockTakeService->updateItem($stockTakeId, $itemId, $actualQuantity);
            return response()->json($item->load('product'));
        } catch (\Throwable $e) {
            Log::error('StockTakeController@updateItem', ['error' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function complete(int $id): JsonResponse
    {
        try {
            $user = Auth::user();
            $stockTake = $this->stockTakeService->complete($id, $user);
            return response()->json($stockTake);
        } catch (\Throwable $e) {
            Log::error('StockTakeController@complete', ['error' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
