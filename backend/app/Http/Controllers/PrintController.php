<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PrintController extends Controller
{
    public function __construct(
        private OrderService $orderService
    ) {}

    public function printData(Request $request, int $id): JsonResponse
    {
        $order = $this->orderService->find($id);
        if (!$order) {
            return response()->json(['message' => '订单不存在'], 404);
        }

        $shipment = $order->shipment;

        $orderStatusMap = [
            'pending' => '待付款',
            'paid' => '已付款',
            'shipped' => '已发货',
            'cancelled' => '已取消',
            'completed' => '已完成',
        ];

        $items = $order->items->map(function ($item) {
            return [
                'id' => $item->id,
                'product_name' => $item->product_name,
                'product_sku' => $item->product_sku,
                'price' => (float) $item->price,
                'quantity' => $item->quantity,
                'subtotal' => (float) $item->subtotal,
            ];
        });

        $data = [
            'id' => $order->id,
            'order_no' => $order->order_no,
            'status' => $order->status,
            'status_label' => $orderStatusMap[$order->status] ?? $order->status,
            'total_amount' => (float) $order->total_amount,
            'remark' => $order->remark,
            'created_at' => $order->created_at?->toIso8601String(),
            'user' => $order->user ? ['id' => $order->user->id, 'name' => $order->user->name] : null,
            'items' => $items,
            'shipment' => $shipment ? [
                'tracking_no' => $shipment->tracking_no,
                'logistics_company' => $shipment->logistics_company,
                'shipped_at' => $shipment->shipped_at?->toIso8601String(),
                'receiver_name' => $shipment->receiver_name,
                'receiver_phone' => $shipment->receiver_phone,
                'receiver_address' => $shipment->receiver_address,
            ] : null,
            'store_name' => config('app.name', '商品管理系统'),
            'print_time' => now()->toIso8601String(),
        ];

        return response()->json($data);
    }

    public function exportHtml(Request $request, int $id)
    {
        $order = $this->orderService->find($id);
        if (!$order) {
            abort(404, '订单不存在');
        }

        $shipment = $order->shipment;

        $orderStatusMap = [
            'pending' => '待付款',
            'paid' => '已付款',
            'shipped' => '已发货',
            'cancelled' => '已取消',
            'completed' => '已完成',
        ];

        $items = $order->items;
        $printTime = now()->format('Y-m-d H:i:s');
        $storeName = config('app.name', '商品管理系统');
        $statusLabel = $orderStatusMap[$order->status] ?? $order->status;

        $rows = '';
        foreach ($items as $item) {
            $sku = htmlspecialchars($item->product_sku ?? '-', ENT_QUOTES, 'UTF-8');
            $name = htmlspecialchars($item->product_name, ENT_QUOTES, 'UTF-8');
            $rows .= '<tr>';
            $rows .= '<td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left">' . $name . '</td>';
            $rows .= '<td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;font-family:monospace">' . $sku . '</td>';
            $rows .= '<td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right">¥' . number_format((float) $item->price, 2) . '</td>';
            $rows .= '<td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center">' . $item->quantity . '</td>';
            $rows .= '<td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;font-weight:600">¥' . number_format((float) $item->subtotal, 2) . '</td>';
            $rows .= '</tr>';
        }

        $receiverHtml = '';
        if ($shipment && ($shipment->receiver_name || $shipment->receiver_phone || $shipment->receiver_address)) {
            $receiverHtml = '<div style="margin-bottom:20px;padding:16px;background:#fff8f0;border:1px solid #ffd5b0;border-radius:8px">';
            $receiverHtml .= '<h3 style="margin:0 0 10px 0;font-size:14px;color:#FF6A00">收货信息</h3>';
            $receiverHtml .= '<table style="width:100%;border:none">';
            if ($shipment->receiver_name) {
                $receiverHtml .= '<tr><td style="padding:4px 0;color:#666;width:80px">收件人</td><td style="padding:4px 0;font-weight:500">' . htmlspecialchars($shipment->receiver_name, ENT_QUOTES, 'UTF-8') . '</td></tr>';
            }
            if ($shipment->receiver_phone) {
                $receiverHtml .= '<tr><td style="padding:4px 0;color:#666">联系电话</td><td style="padding:4px 0">' . htmlspecialchars($shipment->receiver_phone, ENT_QUOTES, 'UTF-8') . '</td></tr>';
            }
            if ($shipment->receiver_address) {
                $receiverHtml .= '<tr><td style="padding:4px 0;color:#666">收货地址</td><td style="padding:4px 0">' . htmlspecialchars($shipment->receiver_address, ENT_QUOTES, 'UTF-8') . '</td></tr>';
            }
            $receiverHtml .= '</table></div>';
        }

        $remarkHtml = '';
        if ($order->remark) {
            $remarkHtml = '<div style="margin-bottom:20px;padding:12px 16px;background:#fefce8;border:1px solid #fde68a;border-radius:8px">';
            $remarkHtml .= '<span style="color:#92400e;font-weight:500">备注：</span>' . htmlspecialchars($order->remark, ENT_QUOTES, 'UTF-8');
            $remarkHtml .= '</div>';
        }

        $html = <<<HTML
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>发货单 - {$order->order_no}</title>
<style>
  @page { margin: 15mm; }
  body { font-family: -apple-system, "Microsoft YaHei", "PingFang SC", sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #FF6A00; padding-bottom: 16px; }
  .store-name { font-size: 24px; font-weight: 700; color: #FF6A00; }
  .store-sub { font-size: 12px; color: #999; margin-top: 2px; }
  .order-no { text-align: right; }
  .order-no .label { font-size: 12px; color: #999; }
  .order-no .value { font-size: 18px; font-weight: 700; font-family: monospace; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 20px; padding: 16px; background: #fafafa; border-radius: 8px; }
  .info-grid .label { font-size: 13px; color: #888; }
  .info-grid .value { font-size: 14px; font-weight: 500; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  table.items thead th { padding: 10px 12px; background: #FF6A00; color: #fff; text-align: left; font-size: 13px; font-weight: 600; }
  table.items thead th:last-child { text-align: right; }
  table.items thead th:nth-child(3), table.items thead th:nth-child(4) { text-align: right; }
  .total-row td { padding: 12px; border-top: 2px solid #FF6A00; font-size: 16px; font-weight: 700; }
  .total-row .amount { color: #FF6A00; text-align: right; }
  .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; color: #aaa; font-size: 12px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="store-name">{$storeName}</div>
      <div class="store-sub">发货单 / Packing Slip</div>
    </div>
    <div class="order-no">
      <div class="label">订单编号</div>
      <div class="value">{$order->order_no}</div>
    </div>
  </div>

  <div class="info-grid">
    <div><div class="label">订单号</div><div class="value">{$order->order_no}</div></div>
    <div><div class="label">订单状态</div><div class="value">{$statusLabel}</div></div>
    <div><div class="label">下单时间</div><div class="value">{$order->created_at?->format('Y-m-d H:i:s')}</div></div>
    <div><div class="label">客户</div><div class="value">{$order->user?->name ?? '—'}</div></div>
HTML;

        if ($shipment) {
            $logistics = htmlspecialchars($shipment->logistics_company ?? '', ENT_QUOTES, 'UTF-8');
            $tracking = htmlspecialchars($shipment->tracking_no ?? '', ENT_QUOTES, 'UTF-8');
            $shippedAt = $shipment->shipped_at?->format('Y-m-d H:i:s') ?? '—';
            $html .= <<<HTML
    <div><div class="label">物流公司</div><div class="value">{$logistics}</div></div>
    <div><div class="label">运单号</div><div class="value" style="font-family:monospace">{$tracking}</div></div>
    <div><div class="label">发货时间</div><div class="value">{$shippedAt}</div></div>
HTML;
        }

        $html .= '</div>';

        $html .= $receiverHtml;
        $html .= $remarkHtml;

        $html .= <<<HTML
  <table class="items">
    <thead>
      <tr>
        <th>商品名称</th>
        <th style="text-align:center">SKU</th>
        <th style="text-align:right">单价</th>
        <th style="text-align:right">数量</th>
        <th style="text-align:right">小计</th>
      </tr>
    </thead>
    <tbody>
      {$rows}
      <tr class="total-row">
        <td colspan="4" style="text-align:right;border:none">合计</td>
        <td class="amount" style="border:none">¥{$order->total_amount}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <span>打印时间：{$printTime}</span>
    <span>此发货单由系统自动生成</span>
  </div>
</body>
</html>
HTML;

        $filename = '发货单_' . $order->order_no . '.html';

        return response($html)
            ->header('Content-Type', 'text/html; charset=utf-8')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
    }
}
