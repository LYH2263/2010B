<?php

namespace App\Services;

use App\Models\PriceHistory;
use App\Models\Product;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class ProductService
{
    public function __construct(
        private PriceHistoryService $priceHistoryService
    ) {}

    /**
     * @param array{filters?: array{keyword?: string, tag_ids?: int[], tag_mode?: string}} $options
     */
    public function list(?int $categoryId = null, int $perPage = 15, array $options = []): LengthAwarePaginator
    {
        $q = Product::with(['category', 'tags'])->orderBy('id', 'desc');
        if ($categoryId !== null) {
            $q->where('category_id', $categoryId);
        }
        $filters = $options['filters'] ?? [];
        if (!empty($filters['keyword'])) {
            $kw = trim($filters['keyword']);
            $q->where(function ($q) use ($kw) {
                $q->where('name', 'like', '%' . $kw . '%')->orWhere('sku', 'like', '%' . $kw . '%');
            });
        }
        if (!empty($filters['tag_ids']) && is_array($filters['tag_ids'])) {
            $tagIds = array_values(array_filter($filters['tag_ids'], 'is_numeric'));
            $tagIds = array_map('intval', $tagIds);
            if (!empty($tagIds)) {
                $mode = $filters['tag_mode'] ?? 'any';
                if ($mode === 'all') {
                    $q->whereHas('tags', function ($subQ) use ($tagIds) {
                        $subQ->whereIn('tags.id', $tagIds);
                    }, '=', count($tagIds));
                } else {
                    $q->whereHas('tags', function ($subQ) use ($tagIds) {
                        $subQ->whereIn('tags.id', $tagIds);
                    });
                }
            }
        }
        return $q->paginate($perPage);
    }

    public function create(array $data): Product
    {
        return DB::transaction(function () use ($data) {
            $tagIds = $data['tag_ids'] ?? null;
            unset($data['tag_ids']);
            $product = Product::create($data);
            if (is_array($tagIds)) {
                $product->tags()->sync($tagIds);
            }
            return $product->load(['category', 'tags']);
        });
    }

    public function update(Product $product, array $data): Product
    {
        return DB::transaction(function () use ($product, $data) {
            $oldPrice = (float) $product->price;
            $tagIds = $data['tag_ids'] ?? null;
            $reason = $data['price_reason'] ?? null;
            unset($data['tag_ids'], $data['price_reason']);

            $product->update($data);

            $newPrice = (float) $product->price;
            if (abs($newPrice - $oldPrice) >= 0.01) {
                $this->priceHistoryService->record(
                    product: $product,
                    oldPrice: $oldPrice,
                    newPrice: $newPrice,
                    changeType: PriceHistory::TYPE_FIXED,
                    reason: $reason
                );
            }

            if (is_array($tagIds)) {
                $product->tags()->sync($tagIds);
            }
            return $product->fresh()->load(['category', 'tags']);
        });
    }

    public function delete(Product $product): void
    {
        $product->delete();
    }

    public function find(int $id): ?Product
    {
        return Product::with(['category', 'tags'])->find($id);
    }

    public function onSaleProducts(): \Illuminate\Database\Eloquent\Collection
    {
        return Product::onSale()->with('tags')->orderBy('id')->get();
    }
}
