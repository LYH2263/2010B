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
}
