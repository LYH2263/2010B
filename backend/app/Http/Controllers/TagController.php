<?php

namespace App\Http\Controllers;

use App\Http\Requests\TagRequest;
use App\Services\TagService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TagController extends Controller
{
    public function __construct(
        private TagService $tagService
    ) {}

    public function index(Request $request): JsonResponse|\Illuminate\View\View
    {
        $perPage = min((int) $request->query('per_page', 15), 50);
        $tags = $this->tagService->list($perPage);
        if ($request->expectsJson()) {
            return response()->json($tags);
        }
        return view('tags.index', ['tags' => $tags]);
    }

    public function all(Request $request): JsonResponse
    {
        $keyword = $request->query('keyword');
        if (is_string($keyword) && trim($keyword) === '') {
            $keyword = null;
        }
        if (!is_string($keyword)) {
            $keyword = null;
        }
        $tags = $this->tagService->allWithSearch($keyword);
        return response()->json($tags);
    }

    public function forSelect(Request $request): JsonResponse
    {
        return response()->json($this->tagService->allForSelect());
    }

    public function create(Request $request): \Illuminate\View\View|JsonResponse
    {
        if ($request->expectsJson()) {
            return response()->json([]);
        }
        return view('tags.create');
    }

    public function store(TagRequest $request): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $tag = $this->tagService->create($request->validated());
        if ($request->expectsJson()) {
            return response()->json($tag, 201);
        }
        return redirect()->route('tags.index')->with('success', '标签已创建');
    }

    public function findOrCreate(Request $request): JsonResponse
    {
        $name = trim((string) $request->input('name', ''));
        if ($name === '') {
            return response()->json(['message' => '标签名称不能为空'], 422);
        }
        if (mb_strlen($name) > 64) {
            return response()->json(['message' => '标签名称不能超过64个字符'], 422);
        }
        $color = (string) $request->input('color', '#6366f1');
        if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
            $color = '#6366f1';
        }
        $tag = $this->tagService->findOrCreateByName($name, $color);
        return response()->json($tag, 201);
    }

    public function edit(Request $request, int $id): JsonResponse|\Illuminate\View\View
    {
        $tag = $this->tagService->find($id);
        if (!$tag) {
            if ($request->expectsJson()) {
                return response()->json(['message' => '标签不存在'], 404);
            }
            abort(404);
        }
        if ($request->expectsJson()) {
            return response()->json($tag);
        }
        return view('tags.edit', ['tag' => $tag]);
    }

    public function update(TagRequest $request, int $id): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $tag = $this->tagService->find($id);
        if (!$tag) {
            if ($request->expectsJson()) {
                return response()->json(['message' => '标签不存在'], 404);
            }
            abort(404);
        }
        $this->tagService->update($tag, $request->validated());
        if ($request->expectsJson()) {
            return response()->json($tag->fresh());
        }
        return redirect()->route('tags.index')->with('success', '已更新');
    }

    public function destroy(Request $request, int $id): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $tag = $this->tagService->find($id);
        if (!$tag) {
            if ($request->expectsJson()) {
                return response()->json(['message' => '标签不存在'], 404);
            }
            abort(404);
        }
        $this->tagService->delete($tag);
        if ($request->expectsJson()) {
            return response()->json(null, 204);
        }
        return redirect()->route('tags.index')->with('success', '已删除');
    }
}
