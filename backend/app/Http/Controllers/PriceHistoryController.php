<?php

namespace App\Http\Controllers;

use App\Services\PriceHistoryService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class PriceHistoryController extends Controller
{
    public function __construct(
        private PriceHistoryService $priceHistoryService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $productId = $request->query('product_id') ? (int) $request->query('product_id') : null;
        $perPage = min((int) $request->query('per_page', 20), 100);

        $histories = $this->priceHistoryService->list($productId, $perPage);

        return response()->json($histories);
    }

    public function preview(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'product_ids' => 'required|array|min:1',
                'product_ids.*' => 'required|integer|exists:products,id',
                'change_type' => ['required', 'string', Rule::in(['fixed', 'percentage', 'amount'])],
                'value' => 'required|numeric|min:0',
                'direction' => ['required', 'string', Rule::in(['up', 'down'])],
            ]);

            $preview = $this->priceHistoryService->preview(
                productIds: $validated['product_ids'],
                changeType: $validated['change_type'],
                value: $validated['value'],
                direction: $validated['direction'],
            );

            return response()->json(['preview' => $preview]);
        } catch (\Throwable $e) {
            Log::error('PriceHistoryController@preview', ['error' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function batchUpdate(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'product_ids' => 'required|array|min:1',
                'product_ids.*' => 'required|integer|exists:products,id',
                'change_type' => ['required', 'string', Rule::in(['fixed', 'percentage', 'amount'])],
                'value' => 'required|numeric|min:0',
                'direction' => ['required', 'string', Rule::in(['up', 'down'])],
                'reason' => 'nullable|string|max:500',
            ]);

            $results = $this->priceHistoryService->batchUpdate(
                productIds: $validated['product_ids'],
                changeType: $validated['change_type'],
                value: $validated['value'],
                direction: $validated['direction'],
                reason: $validated['reason'] ?? null,
            );

            return response()->json($results);
        } catch (\Throwable $e) {
            Log::error('PriceHistoryController@batchUpdate', ['error' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function chart(Request $request, int $productId): JsonResponse
    {
        $data = $this->priceHistoryService->getChartData($productId);

        return response()->json(['data' => $data]);
    }

    public function byProduct(Request $request, int $productId): JsonResponse
    {
        $perPage = min((int) $request->query('per_page', 20), 100);
        $histories = $this->priceHistoryService->getByProduct($productId, $perPage);

        return response()->json($histories);
    }
}
