<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->query('per_page', 50), 100);
        $keyword = $request->query('keyword');

        $q = User::orderBy('id', 'asc');

        if ($keyword && is_string($keyword) && trim($keyword) !== '') {
            $keyword = trim($keyword);
            $q->where(function ($query) use ($keyword) {
                $query->where('name', 'like', "%{$keyword}%")
                    ->orWhere('email', 'like', "%{$keyword}%");
            });
        }

        $users = $q->paginate($perPage);

        return response()->json($users);
    }

    public function show(int $id): JsonResponse
    {
        $user = User::with('pointAccount.level')->find($id);
        if (!$user) {
            return response()->json(['message' => '用户不存在'], 404);
        }
        return response()->json($user);
    }
}
