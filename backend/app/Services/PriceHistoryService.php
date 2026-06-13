<?php

namespace App\Services;

use App\Models\PriceHistory;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class PriceHistoryService
{
    public function record(
        Product $product,
        float $oldPrice,
        float $newPrice,
        string $changeType,
        ?string $reason = null,
        ?float $changePercent = null
    ): PriceHistory {
        $changeAmount = $newPrice - $oldPrice;

        if ($changePercent === null && $oldPrice > 0) {
            $changePercent = round(($changeAmount / $oldPrice) * 100, 2);
        }

        return PriceHistory::create([
            'product_id' => $product->id,
            'old_price' => $oldPrice,
            'new_price' => $newPrice,
            'change_amount' => $changeAmount,
            'change_percent' => $changePercent,
            'change_type' => $changeType,
            'reason' => $reason,
            'user_id' => Auth::check() ? Auth::id() : null,
        ]);
    }

    public function getByProduct(int $productId, int $perPage = 20)
    {
        return PriceHistory::with('user')
            ->where('product_id', $productId)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    public function getChartData(int $productId): array
    {
        $histories = PriceHistory::where('product_id', $productId)
            ->orderBy('created_at', 'asc')
            ->get(['new_price as price', 'created_at as time']);

        $product = Product::find($productId);
        if ($product && $histories->isEmpty()) {
            return [[
                'price' => (float) $product->price,
                'time' => $product->created_at->format('Y-m-d H:i'),
            ]];
        }

        if ($product && $histories->isNotEmpty()) {
            $first = $histories->first();
            $originalPrice = PriceHistory::where('product_id', $productId)
                ->orderBy('created_at', 'asc')
                ->value('old_price');

            $result = [];
            if ($originalPrice !== null) {
                $result[] = [
                    'price' => (float) $originalPrice,
                    'time' => $product->created_at->format('Y-m-d H:i'),
                ];
            }

            foreach ($histories as $h) {
                $result[] = [
                    'price' => (float) $h->price,
                    'time' => $h->time->format('Y-m-d H:i'),
                ];
            }

            return $result;
        }

        return $histories->map(function ($h) {
            return [
                'price' => (float) $h->price,
                'time' => $h->time->format('Y-m-d H:i'),
            ];
        })->all();
    }

    public function preview(array $productIds, string $changeType, $value, string $direction = 'up'): array
    {
        $products = Product::whereIn('id', $productIds)->get(['id', 'name', 'sku', 'price']);
        $preview = [];

        foreach ($products as $product) {
            $oldPrice = (float) $product->price;
            $newPrice = $this->calculateNewPrice($oldPrice, $changeType, $value, $direction);
            $changeAmount = round($newPrice - $oldPrice, 2);
            $changePercent = $oldPrice > 0 ? round(($changeAmount / $oldPrice) * 100, 2) : 0;

            $preview[] = [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'old_price' => $oldPrice,
                'new_price' => $newPrice,
                'change_amount' => $changeAmount,
                'change_percent' => $changePercent,
                'valid' => $newPrice >= 0,
            ];
        }

        return $preview;
    }

    public function calculateNewPrice(float $oldPrice, string $changeType, $value, string $direction = 'up'): float
    {
        $value = (float) $value;
        $sign = $direction === 'up' ? 1 : -1;

        return match ($changeType) {
            PriceHistory::TYPE_FIXED => round($value, 2),
            PriceHistory::TYPE_PERCENTAGE => round($oldPrice * (1 + $sign * $value / 100), 2),
            PriceHistory::TYPE_AMOUNT => round($oldPrice + $sign * $value, 2),
            default => $oldPrice,
        };
    }

    public function batchUpdate(array $productIds, string $changeType, $value, string $direction, ?string $reason = null): array
    {
        return DB::transaction(function () use ($productIds, $changeType, $value, $direction, $reason) {
            $products = Product::whereIn('id', $productIds)->lockForUpdate()->get();
            $results = ['success' => 0, 'failed' => 0, 'items' => []];

            foreach ($products as $product) {
                $oldPrice = (float) $product->price;
                $newPrice = $this->calculateNewPrice($oldPrice, $changeType, $value, $direction);

                if ($newPrice < 0) {
                    $results['failed']++;
                    $results['items'][] = [
                        'id' => $product->id,
                        'name' => $product->name,
                        'success' => false,
                        'message' => '价格不能为负数',
                    ];
                    continue;
                }

                if (abs($newPrice - $oldPrice) < 0.01) {
                    $results['items'][] = [
                        'id' => $product->id,
                        'name' => $product->name,
                        'success' => true,
                        'skipped' => true,
                        'message' => '价格无变化',
                    ];
                    continue;
                }

                $product->update(['price' => $newPrice]);

                $this->record(
                    product: $product,
                    oldPrice: $oldPrice,
                    newPrice: $newPrice,
                    changeType: $changeType,
                    reason: $reason,
                    changePercent: $oldPrice > 0 ? round((($newPrice - $oldPrice) / $oldPrice) * 100, 2) : 0
                );

                $results['success']++;
                $results['items'][] = [
                    'id' => $product->id,
                    'name' => $product->name,
                    'success' => true,
                    'old_price' => $oldPrice,
                    'new_price' => $newPrice,
                ];
            }

            return $results;
        });
    }

    public function list(?int $productId = null, int $perPage = 20)
    {
        $query = PriceHistory::with(['product', 'user'])->orderBy('created_at', 'desc');

        if ($productId !== null) {
            $query->where('product_id', $productId);
        }

        return $query->paginate($perPage);
    }
}
