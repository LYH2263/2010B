<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Shipment;
use App\Services\ShipmentService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class ShipmentController extends Controller
{
    public function __construct(
        private ShipmentService $shipmentService
    ) {}

    public function index(Request $request): JsonResponse|\Illuminate\View\View
    {
        $perPage = min((int) $request->query('per_page', 15), 50);
        $status = $request->query('status');
        $filters = [];
        $trackingNo = $request->query('tracking_no');
        if (is_string($trackingNo) && trim($trackingNo) !== '') {
            $filters['tracking_no'] = trim($trackingNo);
        }
        $company = $request->query('logistics_company');
        if (is_string($company) && trim($company) !== '') {
            $filters['logistics_company'] = trim($company);
        }
        $orderNo = $request->query('order_no');
        if (is_string($orderNo) && trim($orderNo) !== '') {
            $filters['order_no'] = trim($orderNo);
        }
        $shipments = $this->shipmentService->list($perPage, $status ?? null, ['filters' => $filters]);
        if ($request->expectsJson()) {
            $payload = $shipments->toArray();
            $payload['status_counts'] = Shipment::selectRaw('status, count(*) as count')
                ->groupBy('status')
                ->pluck('count', 'status')
                ->toArray();
            return response()->json($payload);
        }
        return view('shipments.index', ['shipments' => $shipments]);
    }

    public function create(Request $request, Order $order): JsonResponse|\Illuminate\View\View
    {
        if ($request->expectsJson()) {
            return response()->json(['order' => $order]);
        }
        return view('shipments.create', ['order' => $order]);
    }

    public function store(Request $request, Order $order): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        try {
            $validated = $request->validate([
                'logistics_company' => 'required|string|max:64',
                'tracking_no' => 'required|string|max:64',
                'shipped_at' => 'nullable|date',
                'receiver_name' => 'nullable|string|max:64',
                'receiver_phone' => 'nullable|string|max:32',
                'receiver_address' => 'nullable|string|max:255',
                'ship_from_location' => 'nullable|string|max:128',
            ]);
            $shipment = $this->shipmentService->createForOrder($order, $validated);
            if ($request->expectsJson()) {
                return response()->json($shipment, 201);
            }
            return redirect()->route('shipments.show', $shipment)->with('success', '运单已创建，订单已标记为已发货');
        } catch (\Throwable $e) {
            Log::error('ShipmentController@store', ['error' => $e->getMessage()]);
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            return back()->withInput()->with('error', $e->getMessage());
        }
    }

    public function show(Request $request, int $id): JsonResponse|\Illuminate\View\View
    {
        $shipment = $this->shipmentService->find($id);
        if (!$shipment) {
            if ($request->expectsJson()) {
                return response()->json(['message' => '运单不存在'], 404);
            }
            abort(404);
        }
        if ($request->expectsJson()) {
            return response()->json($shipment);
        }
        return view('shipments.show', ['shipment' => $shipment]);
    }

    public function addTrack(Request $request, Shipment $shipment): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        try {
            $validated = $request->validate([
                'description' => 'required|string|max:255',
                'location' => 'nullable|string|max:128',
                'tracked_at' => 'nullable|date',
                'update_status' => 'nullable|in:delivered',
            ]);
            $track = $this->shipmentService->addTrack($shipment, $validated);
            if ($request->expectsJson()) {
                return response()->json(['track' => $track, 'shipment' => $shipment->fresh()->load('tracks')], 201);
            }
            return redirect()->route('shipments.show', $shipment)->with('success', '轨迹节点已追加');
        } catch (\Throwable $e) {
            Log::error('ShipmentController@addTrack', ['error' => $e->getMessage()]);
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            return back()->withInput()->with('error', $e->getMessage());
        }
    }

    public function updateStatus(Request $request, Shipment $shipment): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $request->validate(['status' => 'required|in:pending,shipped,in_transit,delivered']);
        try {
            $this->shipmentService->updateStatus($shipment, $request->input('status'));
            if ($request->expectsJson()) {
                return response()->json($shipment->fresh()->load('tracks'));
            }
            return redirect()->route('shipments.show', $shipment)->with('success', '状态已更新');
        } catch (\Throwable $e) {
            Log::error('ShipmentController@updateStatus', ['error' => $e->getMessage()]);
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            return back()->withInput()->with('error', $e->getMessage());
        }
    }

    public function byOrder(Request $request, Order $order): JsonResponse
    {
        $shipment = $this->shipmentService->getByOrder($order->id);
        return response()->json($shipment);
    }
}
