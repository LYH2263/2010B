<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Shipment;
use App\Models\ShipmentTrack;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;

class ShipmentService
{
    public function __construct(
        private OrderService $orderService
    ) {}

    /**
     * @param array{filters?: array{status?: string, tracking_no?: string, logistics_company?: string, order_no?: string}} $options
     */
    public function list(int $perPage = 15, ?string $status = null, array $options = []): LengthAwarePaginator
    {
        $q = Shipment::with(['order', 'tracks'])->orderBy('id', 'desc');
        if ($status !== null && $status !== '') {
            $allowed = [Shipment::STATUS_PENDING, Shipment::STATUS_SHIPPED, Shipment::STATUS_IN_TRANSIT, Shipment::STATUS_DELIVERED];
            if (in_array($status, $allowed, true)) {
                $q->where('status', $status);
            }
        }
        $filters = $options['filters'] ?? [];
        if (!empty($filters['tracking_no'])) {
            $q->where('tracking_no', 'like', '%' . trim($filters['tracking_no']) . '%');
        }
        if (!empty($filters['logistics_company'])) {
            $q->where('logistics_company', 'like', '%' . trim($filters['logistics_company']) . '%');
        }
        if (!empty($filters['order_no'])) {
            $q->whereHas('order', function ($q) use ($filters) {
                $q->where('order_no', 'like', '%' . trim($filters['order_no']) . '%');
            });
        }
        return $q->paginate($perPage);
    }

    public function createForOrder(Order $order, array $data): Shipment
    {
        if ($order->status !== Order::STATUS_PAID && $order->status !== Order::STATUS_PENDING) {
            throw new \InvalidArgumentException('仅待付款或已付款的订单可创建运单');
        }
        if (empty($data['logistics_company'])) {
            throw new \InvalidArgumentException('请填写物流公司');
        }
        if (empty($data['tracking_no'])) {
            throw new \InvalidArgumentException('请填写运单号');
        }

        $exists = Shipment::where('logistics_company', $data['logistics_company'])
            ->where('tracking_no', $data['tracking_no'])
            ->exists();
        if ($exists) {
            throw new \InvalidArgumentException('该运单号已存在');
        }

        return DB::transaction(function () use ($order, $data) {
            $shippedAt = !empty($data['shipped_at']) ? new \DateTime($data['shipped_at']) : now();
            $shipment = Shipment::create([
                'order_id' => $order->id,
                'tracking_no' => trim($data['tracking_no']),
                'logistics_company' => trim($data['logistics_company']),
                'shipped_at' => $shippedAt,
                'receiver_name' => $data['receiver_name'] ?? null,
                'receiver_phone' => $data['receiver_phone'] ?? null,
                'receiver_address' => $data['receiver_address'] ?? null,
                'status' => Shipment::STATUS_SHIPPED,
            ]);

            ShipmentTrack::create([
                'shipment_id' => $shipment->id,
                'description' => '快件已揽收，等待发出',
                'location' => $data['ship_from_location'] ?? '发货仓库',
                'tracked_at' => $shippedAt,
            ]);

            $this->orderService->updateStatus($order, Order::STATUS_SHIPPED);

            return $shipment->load('tracks');
        });
    }

    public function find(int $id): ?Shipment
    {
        return Shipment::with(['order', 'tracks'])->find($id);
    }

    public function addTrack(Shipment $shipment, array $data): ShipmentTrack
    {
        if ($shipment->status === Shipment::STATUS_DELIVERED) {
            throw new \InvalidArgumentException('运单已签收，无法追加轨迹');
        }
        if (empty($data['description'])) {
            throw new \InvalidArgumentException('请填写轨迹描述');
        }
        $trackedAt = !empty($data['tracked_at']) ? new \DateTime($data['tracked_at']) : now();

        return DB::transaction(function () use ($shipment, $data, $trackedAt) {
            $track = ShipmentTrack::create([
                'shipment_id' => $shipment->id,
                'description' => trim($data['description']),
                'location' => $data['location'] ?? null,
                'tracked_at' => $trackedAt,
            ]);

            $newStatus = $shipment->status;
            if (!empty($data['update_status']) && $data['update_status'] === 'delivered') {
                $newStatus = Shipment::STATUS_DELIVERED;
            } elseif ($shipment->status === Shipment::STATUS_SHIPPED) {
                $newStatus = Shipment::STATUS_IN_TRANSIT;
            }
            if ($newStatus !== $shipment->status) {
                $shipment->update(['status' => $newStatus]);
                if ($newStatus === Shipment::STATUS_DELIVERED && $shipment->order->status === Order::STATUS_SHIPPED) {
                    $this->orderService->updateStatus($shipment->order, Order::STATUS_COMPLETED);
                }
            }

            return $track;
        });
    }

    public function updateStatus(Shipment $shipment, string $status): Shipment
    {
        $allowed = [Shipment::STATUS_PENDING, Shipment::STATUS_SHIPPED, Shipment::STATUS_IN_TRANSIT, Shipment::STATUS_DELIVERED];
        if (!in_array($status, $allowed, true)) {
            throw new \InvalidArgumentException('无效的运单状态');
        }

        return DB::transaction(function () use ($shipment, $status) {
            $oldStatus = $shipment->status;
            $shipment->update(['status' => $status]);

            if ($status === Shipment::STATUS_DELIVERED && $oldStatus !== Shipment::STATUS_DELIVERED) {
                if ($shipment->order && $shipment->order->status === Order::STATUS_SHIPPED) {
                    $this->orderService->updateStatus($shipment->order, Order::STATUS_COMPLETED);
                }
            }

            return $shipment;
        });
    }

    public function getByOrder(int $orderId): ?Shipment
    {
        return Shipment::with('tracks')->where('order_id', $orderId)->orderBy('id', 'desc')->first();
    }

    /**
     * 批量发货
     * @param array{order_id: int, tracking_no: string, logistics_company: string} $items
     * @return array{success: array, failed: array, total: int, success_count: int, failed_count: int}
     */
    public function batchShip(array $items): array
    {
        $success = [];
        $failed = [];
        $usedTrackingNos = [];

        foreach ($items as $index => $item) {
            $orderId = (int) ($item['order_id'] ?? 0);
            $trackingNo = trim((string) ($item['tracking_no'] ?? ''));
            $logisticsCompany = trim((string) ($item['logistics_company'] ?? ''));

            try {
                $order = Order::find($orderId);
                if (!$order) {
                    throw new \InvalidArgumentException('订单不存在');
                }

                if ($order->status !== Order::STATUS_PAID) {
                    throw new \InvalidArgumentException('订单状态不是已付款，无法发货');
                }

                if (empty($logisticsCompany)) {
                    throw new \InvalidArgumentException('请填写物流公司');
                }

                if (empty($trackingNo)) {
                    throw new \InvalidArgumentException('请填写运单号');
                }

                $trackingKey = $logisticsCompany . '|' . $trackingNo;
                if (isset($usedTrackingNos[$trackingKey])) {
                    throw new \InvalidArgumentException('本次批量中运单号重复');
                }

                $exists = Shipment::where('logistics_company', $logisticsCompany)
                    ->where('tracking_no', $trackingNo)
                    ->exists();
                if ($exists) {
                    throw new \InvalidArgumentException('该运单号已存在');
                }

                $usedTrackingNos[$trackingKey] = true;

                DB::beginTransaction();
                try {
                    $shippedAt = now();
                    $shipment = Shipment::create([
                        'order_id' => $order->id,
                        'tracking_no' => $trackingNo,
                        'logistics_company' => $logisticsCompany,
                        'shipped_at' => $shippedAt,
                        'receiver_name' => $item['receiver_name'] ?? null,
                        'receiver_phone' => $item['receiver_phone'] ?? null,
                        'receiver_address' => $item['receiver_address'] ?? null,
                        'status' => Shipment::STATUS_SHIPPED,
                    ]);

                    ShipmentTrack::create([
                        'shipment_id' => $shipment->id,
                        'description' => '快件已揽收，等待发出',
                        'location' => $item['ship_from_location'] ?? '发货仓库',
                        'tracked_at' => $shippedAt,
                    ]);

                    $this->orderService->updateStatus($order, Order::STATUS_SHIPPED);

                    DB::commit();

                    $success[] = [
                        'index' => $index,
                        'order_id' => $order->id,
                        'order_no' => $order->order_no,
                        'tracking_no' => $trackingNo,
                        'logistics_company' => $logisticsCompany,
                        'shipment_id' => $shipment->id,
                    ];
                } catch (\Throwable $e) {
                    DB::rollBack();
                    throw $e;
                }
            } catch (\Throwable $e) {
                $failed[] = [
                    'index' => $index,
                    'order_id' => $orderId,
                    'order_no' => $item['order_no'] ?? null,
                    'tracking_no' => $trackingNo,
                    'logistics_company' => $logisticsCompany,
                    'reason' => $e->getMessage(),
                ];
            }
        }

        return [
            'success' => $success,
            'failed' => $failed,
            'total' => count($items),
            'success_count' => count($success),
            'failed_count' => count($failed),
        ];
    }

    /**
     * 导入运单号批量发货
     * @param array{order_no: string, tracking_no: string} $mappings
     * @param string $logisticsCompany
     * @return array{success: array, failed: array, total: int, success_count: int, failed_count: int}
     */
    public function importTrackingNos(array $mappings, string $logisticsCompany): array
    {
        $items = [];
        $orderNos = [];

        foreach ($mappings as $mapping) {
            $orderNo = trim((string) ($mapping['order_no'] ?? ''));
            $trackingNo = trim((string) ($mapping['tracking_no'] ?? ''));
            if ($orderNo && $trackingNo) {
                $orderNos[] = $orderNo;
                $items[] = [
                    'order_no' => $orderNo,
                    'tracking_no' => $trackingNo,
                ];
            }
        }

        if (empty($items)) {
            throw new \InvalidArgumentException('请提供有效的订单号和运单号映射');
        }

        $orders = Order::whereIn('order_no', $orderNos)->get()->keyBy('order_no');

        $batchItems = [];
        foreach ($items as $item) {
            $order = $orders->get($item['order_no']);
            $batchItems[] = [
                'order_id' => $order ? $order->id : 0,
                'order_no' => $item['order_no'],
                'tracking_no' => $item['tracking_no'],
                'logistics_company' => $logisticsCompany,
            ];
        }

        $result = $this->batchShip($batchItems);

        foreach ($result['success'] as &$s) {
            $order = $orders->get($s['order_no'] ?? '');
            if (!$order) {
                $order = Order::find($s['order_id']);
                if ($order) {
                    $s['order_no'] = $order->order_no;
                }
            }
        }
        unset($s);

        return $result;
    }

    public function generateTrackingNo(string $prefix = 'SF'): string
    {
        return $prefix . date('YmdHis') . str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);
    }

    /**
     * 获取待发货订单列表（已付款）
     * @param int $perPage
     * @param array{filters?: array{order_no?: string, date_from?: string, date_to?: string}} $options
     * @return LengthAwarePaginator
     */
    public function pendingOrders(int $perPage = 15, array $options = []): LengthAwarePaginator
    {
        $q = Order::with(['items', 'user'])
            ->where('status', Order::STATUS_PAID)
            ->orderBy('id', 'desc');

        $filters = $options['filters'] ?? [];
        if (!empty($filters['order_no'])) {
            $q->where('order_no', 'like', '%' . trim($filters['order_no']) . '%');
        }
        if (!empty($filters['date_from'])) {
            $q->whereDate('created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $q->whereDate('created_at', '<=', $filters['date_to']);
        }

        return $q->paginate($perPage);
    }
}
