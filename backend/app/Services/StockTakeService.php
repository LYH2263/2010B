<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockTake;
use App\Models\StockTakeItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class StockTakeService
{
    public function __construct(
        private InventoryService $inventoryService
    ) {}

    /**
     * @param array{filters?: array{status?: string, keyword?: string}} $options
     */
    public function list(int $perPage = 15, array $options = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $q = StockTake::with('operator')->orderBy('id', 'desc');
        $filters = $options['filters'] ?? [];

        if (!empty($filters['status']) && $filters['status'] !== '') {
            $q->where('status', $filters['status']);
        }
        if (!empty($filters['keyword'])) {
            $kw = trim($filters['keyword']);
            $q->where('stock_take_no', 'like', '%' . $kw . '%');
        }

        return $q->paginate($perPage);
    }

    public function detail(int $id): StockTake
    {
        return StockTake::with(['operator', 'items.product.category'])
            ->withCount('items')
            ->findOrFail($id);
    }

    public function create(?User $operator, ?string $remark = ''): StockTake
    {
        return DB::transaction(function () use ($operator, $remark) {
            $stockTakeNo = $this->generateStockTakeNo();

            $stockTake = StockTake::create([
                'stock_take_no' => $stockTakeNo,
                'status' => StockTake::STATUS_PENDING,
                'remark' => $remark ?? '',
                'operator_id' => $operator?->id,
            ]);

            $products = Product::onSale()->get(['id', 'name', 'sku', 'stock']);

            $items = [];
            $now = now();
            foreach ($products as $product) {
                $items[] = [
                    'stock_take_id' => $stockTake->id,
                    'product_id' => $product->id,
                    'book_quantity' => $product->stock,
                    'actual_quantity' => null,
                    'difference' => 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            if (!empty($items)) {
                StockTakeItem::insert($items);
            }

            return $stockTake->fresh();
        });
    }

    public function updateItem(int $stockTakeId, int $itemId, ?int $actualQuantity): StockTakeItem
    {
        $stockTake = StockTake::findOrFail($stockTakeId);
        if ($stockTake->isCompleted()) {
            throw new \InvalidArgumentException('盘点单已完成，无法修改');
        }

        $item = StockTakeItem::where('stock_take_id', $stockTakeId)
            ->where('id', $itemId)
            ->firstOrFail();

        $difference = $actualQuantity !== null ? $actualQuantity - $item->book_quantity : 0;

        $item->update([
            'actual_quantity' => $actualQuantity,
            'difference' => $difference,
        ]);

        return $item->fresh();
    }

    public function complete(int $stockTakeId, ?User $operator = null): StockTake
    {
        return DB::transaction(function () use ($stockTakeId, $operator) {
            $stockTake = StockTake::lockForUpdate()->findOrFail($stockTakeId);

            if ($stockTake->isCompleted()) {
                throw new \InvalidArgumentException('盘点单已完成，请勿重复操作');
            }

            $items = StockTakeItem::where('stock_take_id', $stockTakeId)
                ->with('product')
                ->get();

            foreach ($items as $item) {
                if ($item->difference == 0) {
                    continue;
                }

                if ($item->actual_quantity === null) {
                    continue;
                }

                $product = Product::find($item->product_id);
                if (!$product) {
                    continue;
                }

                $this->inventoryService->adjust($product, $item->difference, '盘点调整');
            }

            $stockTake->update([
                'status' => StockTake::STATUS_COMPLETED,
                'completed_at' => now(),
                'operator_id' => $operator?->id ?? $stockTake->operator_id,
            ]);

            return $stockTake->fresh();
        });
    }

    protected function generateStockTakeNo(): string
    {
        $prefix = 'PD' . date('Ymd');
        $last = StockTake::where('stock_take_no', 'like', $prefix . '%')
            ->orderBy('stock_take_no', 'desc')
            ->first();

        if (!$last) {
            $seq = 1;
        } else {
            $seqStr = substr($last->stock_take_no, strlen($prefix));
            $seq = (int) $seqStr + 1;
        }

        return $prefix . str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }

    public function stats(): array
    {
        $pendingCount = StockTake::where('status', StockTake::STATUS_PENDING)->count();
        $completedCount = StockTake::where('status', StockTake::STATUS_COMPLETED)->count();
        $totalCount = StockTake::count();

        return [
            'total_count' => $totalCount,
            'pending_count' => $pendingCount,
            'completed_count' => $completedCount,
        ];
    }
}
