<?php

namespace App\Http\Controllers;

use App\Http\Requests\PointAdjustRequest;
use App\Models\MemberLevel;
use App\Models\PointAccount;
use App\Models\User;
use App\Services\PointService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class PointController extends Controller
{
    public function __construct(
        private PointService $pointService
    ) {}

    public function index(Request $request): JsonResponse|\Illuminate\View\View
    {
        $perPage = min((int) $request->query('per_page', 15), 50);
        $filters = [];

        $keyword = $request->query('keyword');
        if (is_string($keyword) && trim($keyword) !== '') {
            $filters['keyword'] = trim($keyword);
        }

        $levelId = $request->query('level_id');
        if ($levelId !== null && $levelId !== '') {
            $filters['level_id'] = (int) $levelId;
        }

        $accounts = $this->pointService->listAccounts($perPage, $filters);
        $stats = $this->pointService->getStats();
        $levels = MemberLevel::active()->get();
        $ranking = $this->pointService->getRanking(10);

        if ($request->expectsJson()) {
            $payload = $accounts->toArray();
            $payload['stats'] = $stats;
            $payload['levels'] = $levels;
            $payload['ranking'] = $ranking;
            return response()->json($payload);
        }

        return view('points.index', compact('accounts', 'stats', 'levels', 'ranking'));
    }

    public function show(Request $request, int $accountId): JsonResponse|\Illuminate\View\View
    {
        $account = $this->pointService->getAccount($accountId);
        if (!$account) {
            if ($request->expectsJson()) {
                return response()->json(['message' => '积分账户不存在'], 404);
            }
            abort(404);
        }

        $perPage = min((int) $request->query('per_page', 10), 50);
        $filters = [];

        $type = $request->query('type');
        if ($type !== null && $type !== '') {
            $filters['type'] = $type;
        }

        $dateFrom = $request->query('date_from');
        if (is_string($dateFrom) && trim($dateFrom) !== '') {
            $filters['date_from'] = trim($dateFrom);
        }

        $dateTo = $request->query('date_to');
        if (is_string($dateTo) && trim($dateTo) !== '') {
            $filters['date_to'] = trim($dateTo);
        }

        $transactions = $this->pointService->getTransactions($accountId, $perPage, $filters);
        $nextLevel = $account->next_level;

        if ($request->expectsJson()) {
            $payload = [
                'account' => $account->toArray(),
                'next_level' => $nextLevel,
                'progress_to_next' => $account->progress_to_next_level,
                'points_to_next' => $account->points_to_next_level,
                'transactions' => $transactions->toArray(),
            ];
            return response()->json($payload);
        }

        return view('points.show', compact('account', 'transactions', 'nextLevel'));
    }

    public function showByUser(Request $request, int $userId): JsonResponse
    {
        $account = $this->pointService->getAccountByUser($userId);
        if (!$account) {
            return response()->json(['message' => '用户不存在'], 404);
        }

        return $this->show($request, $account->id);
    }

    public function adjust(PointAdjustRequest $request, int $accountId): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        try {
            $account = $this->pointService->getAccount($accountId);
            if (!$account) {
                if ($request->expectsJson()) {
                    return response()->json(['message' => '积分账户不存在'], 404);
                }
                abort(404);
            }

            $operatorId = Auth::id();
            $transaction = $this->pointService->manualAdjust(
                $account->user_id,
                (int) $request->input('delta'),
                trim($request->input('reason')),
                $operatorId
            );

            if ($request->expectsJson()) {
                return response()->json([
                    'transaction' => $transaction,
                    'account' => $account->fresh()->load('level'),
                ]);
            }

            return redirect()->route('points.show', $accountId)->with('success', '积分调整成功');
        } catch (\Throwable $e) {
            Log::error('PointController@adjust', ['error' => $e->getMessage()]);
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            return back()->with('error', $e->getMessage());
        }
    }

    public function adjustByUser(PointAdjustRequest $request, int $userId): JsonResponse
    {
        $account = PointAccount::where('user_id', $userId)->first();
        if (!$account) {
            $user = User::find($userId);
            if (!$user) {
                return response()->json(['message' => '用户不存在'], 404);
            }
            $account = $user->getOrCreatePointAccount();
        }

        return $this->adjust($request, $account->id);
    }

    public function ranking(Request $request): JsonResponse
    {
        $limit = min((int) $request->query('limit', 10), 100);
        $ranking = $this->pointService->getRanking($limit);
        return response()->json(['ranking' => $ranking]);
    }
}
