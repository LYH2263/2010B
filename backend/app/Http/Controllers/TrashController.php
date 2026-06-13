<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TrashController extends Controller
{
    public function products(Request $request): JsonResponse
    {
        $perPage = min((int) $request->query('per_page', 15), 50);
        $page = max((int) $request->query('page', 1), 1);
        $keyword = $request->query('keyword');

        $query = Product::onlyTrashed()->with(['category' => function ($q) {
            $q->withTrashed();
        }, 'tags'])->orderBy('deleted_at', 'desc');

        if (is_string($keyword) && trim($keyword) !== '') {
            $kw = trim($keyword);
            $query->where(function ($q) use ($kw) {
                $q->where('name', 'like', '%' . $kw . '%')->orWhere('sku', 'like', '%' . $kw . '%');
            });
        }

        $products = $query->paginate($perPage, ['*'], 'page', $page);

        foreach ($products as $product) {
            $product->category_deleted = $product->category && $product->category->trashed();
        }

        return response()->json($products);
    }

    public function categories(Request $request): JsonResponse
    {
        $perPage = min((int) $request->query('per_page', 15), 50);
        $page = max((int) $request->query('page', 1), 1);
        $keyword = $request->query('keyword');

        $query = Category::onlyTrashed()->withCount(['products' => function ($q) {
            $q->withTrashed();
        }])->orderBy('deleted_at', 'desc');

        if (is_string($keyword) && trim($keyword) !== '') {
            $kw = trim($keyword);
            $query->where('name', 'like', '%' . $kw . '%');
        }

        $categories = $query->paginate($perPage, ['*'], 'page', $page);

        return response()->json($categories);
    }

    public function restoreProduct(int $id): JsonResponse
    {
        $product = Product::onlyTrashed()->find($id);
        if (!$product) {
            return response()->json(['message' => '商品不存在或未在回收站中'], 404);
        }

        $category = Category::find($product->category_id);
        if ($product->category_id && !$category) {
            $deletedCategory = Category::onlyTrashed()->find($product->category_id);
            $categoryName = $deletedCategory ? $deletedCategory->name : '未知分类';
            return response()->json([
                'message' => "商品所属分类「{$categoryName}」已被删除，请先恢复该分类或修改商品分类后再恢复。",
                'category_deleted' => true,
                'category_id' => $product->category_id,
                'category_name' => $categoryName,
            ], 422);
        }

        try {
            $product->restore();
            return response()->json(['message' => '商品已恢复', 'product' => $product->fresh()->load(['category', 'tags'])]);
        } catch (\Throwable $e) {
            Log::error('TrashController@restoreProduct', ['error' => $e->getMessage()]);
            return response()->json(['message' => '恢复失败：' . $e->getMessage()], 500);
        }
    }

    public function restoreCategory(int $id): JsonResponse
    {
        $category = Category::onlyTrashed()->find($id);
        if (!$category) {
            return response()->json(['message' => '分类不存在或未在回收站中'], 404);
        }

        try {
            $category->restore();
            return response()->json(['message' => '分类已恢复', 'category' => $category->fresh()]);
        } catch (\Throwable $e) {
            Log::error('TrashController@restoreCategory', ['error' => $e->getMessage()]);
            return response()->json(['message' => '恢复失败：' . $e->getMessage()], 500);
        }
    }

    public function forceDeleteProduct(int $id): JsonResponse
    {
        $product = Product::onlyTrashed()->find($id);
        if (!$product) {
            return response()->json(['message' => '商品不存在或未在回收站中'], 404);
        }

        try {
            DB::transaction(function () use ($product) {
                $product->tags()->detach();
                $product->forceDelete();
            });
            return response()->json(null, 204);
        } catch (\Throwable $e) {
            Log::error('TrashController@forceDeleteProduct', ['error' => $e->getMessage()]);
            return response()->json(['message' => '彻底删除失败：' . $e->getMessage()], 500);
        }
    }

    public function forceDeleteCategory(int $id): JsonResponse
    {
        $category = Category::onlyTrashed()->find($id);
        if (!$category) {
            return response()->json(['message' => '分类不存在或未在回收站中'], 404);
        }

        $productCount = Product::withTrashed()->where('category_id', $id)->count();
        if ($productCount > 0) {
            return response()->json([
                'message' => "该分类下仍有 {$productCount} 个商品（含回收站中），请先处理这些商品后再彻底删除分类。",
                'product_count' => $productCount,
            ], 422);
        }

        try {
            $category->forceDelete();
            return response()->json(null, 204);
        } catch (\Throwable $e) {
            Log::error('TrashController@forceDeleteCategory', ['error' => $e->getMessage()]);
            return response()->json(['message' => '彻底删除失败：' . $e->getMessage()], 500);
        }
    }
}
