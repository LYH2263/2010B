<?php

namespace App\Services;

use App\Models\MemberLevel;
use App\Models\Order;
use App\Models\PointAccount;
use App\Models\PointSetting;
use App\Models\PointTransaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;

class PointService
{
    public function listAccounts(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        $q = PointAccount::with(['user', 'level'])->orderBy('balance', 'desc');

        if (!empty($filters['keyword'])) {
            $keyword = trim($filters['keyword']);
            $q->whereHas('user', function ($query) use ($keyword) {
                $query->where('name', 'like', "%{$keyword}%")
                    ->orWhere('email', 'like', "%{$keyword}%");
            });
        }

        if (!empty($filters['level_id'])) {
            $q->where('level_id', $filters['level_id']);
        }

        return $q->paginate($perPage);
    }

    public function getAccount(int $accountId): ?PointAccount
    {
        return PointAccount::with(['user', 'level'])->find($accountId);
    }

    public function getAccountByUser(int $userId): ?PointAccount
    {
        $user = User::find($userId);
        if ($user) {
            return $user->getOrCreatePointAccount()->load('level', 'user');
        }
        return null;
    }

    public function getTransactions(int $accountId, int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        $q = PointTransaction::with(['operator'])->where('account_id', $accountId)->orderBy('id', 'desc');

        if (!empty($filters['type'])) {
            $q->where('type', $filters['type']);
        }

        if (!empty($filters['date_from'])) {
            $q->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $q->whereDate('created_at', '<=', $filters['date_to']);
        }

        return $q->paginate($perPage);
    }

    public function earnFromOrder(Order $order): ?PointTransaction
    {
        if (!$order->user_id) {
            return null;
        }

        $existing = $order->pointTransactions()
            ->where('type', PointTransaction::TYPE_EARN)
            ->first();
        if ($existing) {
            return $existing;
        }

        $earnRate = PointSetting::getFloat('earn_rate', 1.0);
        $minOrderAmount = PointSetting::getFloat('min_order_amount', 0);
        $roundingMode = PointSetting::getValue('rounding_mode', 'floor');

        $amount = (float) $order->total_amount;
        if ($amount < $minOrderAmount) {
            return null;
        }

        $points = $amount * $earnRate;

        switch ($roundingMode) {
            case 'ceil':
                $points = (int) ceil($points);
                break;
            case 'round':
                $points = (int) round($points);
                break;
            case 'floor':
            default:
                $points = (int) floor($points);
                break;
        }

        if ($points <= 0) {
            return null;
        }

        return $this->createTransaction(
            $order->user_id,
            $points,
            PointTransaction::TYPE_EARN,
            PointTransaction::SOURCE_ORDER,
            $order->id,
            "订单 {$order->order_no} 消费获取积分"
        );
    }

    public function refundForOrder(Order $order): ?PointTransaction
    {
        if (!$order->user_id) {
            return null;
        }

        $earned = $order->pointTransactions()
            ->where('type', PointTransaction::TYPE_EARN)
            ->first();
        if (!$earned) {
            return null;
        }

        $refunded = $order->pointTransactions()
            ->where('type', PointTransaction::TYPE_REFUND)
            ->first();
        if ($refunded) {
            return $refunded;
        }

        $points = $earned->delta;

        return $this->createTransaction(
            $order->user_id,
            -$points,
            PointTransaction::TYPE_REFUND,
            PointTransaction::SOURCE_REFUND,
            $order->id,
            "订单 {$order->order_no} 取消回收积分"
        );
    }

    public function manualAdjust(int $userId, int $delta, string $reason, ?int $operatorId = null): PointTransaction
    {
        $type = $delta > 0 ? PointTransaction::TYPE_EARN : PointTransaction::TYPE_SPEND;
        if ($delta == 0) {
            throw new \InvalidArgumentException('调整积分不能为0');
        }

        return $this->createTransaction(
            $userId,
            $delta,
            PointTransaction::TYPE_ADJUST,
            PointTransaction::SOURCE_MANUAL,
            null,
            $reason,
            $operatorId
        );
    }

    protected function createTransaction(
        int $userId,
        int $delta,
        string $type,
        string $sourceType,
        ?int $sourceId,
        ?string $reason = null,
        ?int $operatorId = null
    ): PointTransaction {
        return DB::transaction(function () use ($userId, $delta, $type, $sourceType, $sourceId, $reason, $operatorId) {
            $user = User::findOrFail($userId);
            $account = $user->getOrCreatePointAccount();

            $newBalance = $account->balance + $delta;
            if ($newBalance < 0) {
                throw new \InvalidArgumentException('积分余额不足');
            }

            $account->balance = $newBalance;
            if ($delta > 0) {
                $account->total_earned += $delta;
            } else {
                $account->total_spent += abs($delta);
            }

            $this->updateLevel($account);
            $account->save();

            return $account->transactions()->create([
                'user_id' => $userId,
                'type' => $type,
                'source_type' => $sourceType,
                'source_id' => $sourceId,
                'delta' => $delta,
                'balance_after' => $account->balance,
                'reason' => $reason,
                'operator_id' => $operatorId,
            ]);
        });
    }

    public function updateLevel(PointAccount $account): void
    {
        $allowDemotion = PointSetting::getBool('allow_demotion', false);
        $levels = MemberLevel::active()->get();

        if ($levels->isEmpty()) {
            $account->level_id = null;
            return;
        }

        $currentLevelId = $account->level_id;
        $newLevel = $levels->filter(function ($level) use ($account) {
            return $level->min_points <= $account->balance;
        })->sortByDesc('min_points')->first();

        if (!$newLevel) {
            $newLevel = $levels->sortBy('min_points')->first();
        }

        if (!$allowDemotion && $currentLevelId) {
            $currentLevel = $levels->firstWhere('id', $currentLevelId);
            if ($currentLevel && $newLevel && $newLevel->min_points < $currentLevel->min_points) {
                return;
            }
        }

        if ($newLevel && $newLevel->id !== $currentLevelId) {
            $account->level_id = $newLevel->id;
            $account->level_updated_at = now();
        }
    }

    public function recalculateAllLevels(): void
    {
        $allowDemotion = PointSetting::getBool('allow_demotion', false);
        $levels = MemberLevel::active()->get();

        if ($levels->isEmpty()) {
            return;
        }

        PointAccount::chunk(100, function ($accounts) use ($levels, $allowDemotion) {
            foreach ($accounts as $account) {
                $currentLevelId = $account->level_id;

                $newLevel = $levels->filter(function ($level) use ($account) {
                    return $level->min_points <= $account->balance;
                })->sortByDesc('min_points')->first();

                if (!$newLevel) {
                    $newLevel = $levels->sortBy('min_points')->first();
                }

                if (!$allowDemotion && $currentLevelId) {
                    $currentLevel = $levels->firstWhere('id', $currentLevelId);
                    if ($currentLevel && $newLevel && $newLevel->min_points < $currentLevel->min_points) {
                        continue;
                    }
                }

                if ($newLevel && $newLevel->id !== $currentLevelId) {
                    $account->level_id = $newLevel->id;
                    $account->level_updated_at = now();
                    $account->save();
                }
            }
        });
    }

    public function getStats(): array
    {
        return [
            'total_accounts' => PointAccount::count(),
            'total_points' => PointAccount::sum('balance'),
            'total_earned' => PointAccount::sum('total_earned'),
            'avg_balance' => PointAccount::avg('balance') ?? 0,
            'level_distribution' => MemberLevel::withCount('accounts')->active()->get()->map(function ($level) {
                return [
                    'id' => $level->id,
                    'name' => $level->name,
                    'count' => $level->accounts_count,
                    'color' => $level->color,
                ];
            }),
        ];
    }

    public function getRanking(int $limit = 10): array
    {
        return PointAccount::with('user', 'level')
            ->orderBy('balance', 'desc')
            ->limit($limit)
            ->get()
            ->values()
            ->map(function ($account, $index) {
                $account->rank = $index + 1;
                return $account;
            })
            ->toArray();
    }
}
