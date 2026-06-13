<?php

namespace App\Services;

use App\Models\Tag;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class TagService
{
    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return Tag::withCount('products')
            ->orderBy('id', 'desc')
            ->paginate($perPage);
    }

    public function create(array $data): Tag
    {
        return Tag::create($data);
    }

    public function update(Tag $tag, array $data): Tag
    {
        $tag->update($data);
        return $tag;
    }

    public function delete(Tag $tag): void
    {
        DB::transaction(function () use ($tag) {
            $tag->products()->detach();
            $tag->delete();
        });
    }

    public function find(int $id): ?Tag
    {
        return Tag::find($id);
    }

    public function allForSelect()
    {
        return Tag::active()->orderBy('name')->get(['id', 'name', 'color']);
    }

    public function allWithSearch(?string $keyword = null)
    {
        $q = Tag::orderBy('name');
        if ($keyword && trim($keyword) !== '') {
            $kw = trim($keyword);
            $q->where('name', 'like', '%' . $kw . '%');
        }
        return $q->get(['id', 'name', 'color', 'status']);
    }

    public function findOrCreateByName(string $name, string $color = '#6366f1'): Tag
    {
        $name = trim($name);
        $tag = Tag::where('name', $name)->first();
        if ($tag) {
            return $tag;
        }
        return Tag::create([
            'name' => $name,
            'color' => $color,
            'status' => Tag::STATUS_ACTIVE,
        ]);
    }
}
