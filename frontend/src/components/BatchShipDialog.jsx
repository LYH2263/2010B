import { useState, useEffect } from 'react'
import { batchShip } from '../api'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const LOGISTICS_COMPANIES = ['顺丰速运', '中通快递', '圆通速递', '申通快递', '韵达快递', '极兔速递', '邮政EMS', '京东物流', '德邦快递', '其他']

export default function BatchShipDialog({ selectedOrders, onClose, onSuccess }) {
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [logisticsCompany, setLogisticsCompany] = useState(LOGISTICS_COMPANIES[0])
  const [customCompany, setCustomCompany] = useState('')
  const [trackingMode, setTrackingMode] = useState('auto')
  const [trackingPrefix, setTrackingPrefix] = useState('SF')
  const [trackingNos, setTrackingNos] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const selectedCompany = logisticsCompany === '其他' ? customCompany.trim() : logisticsCompany

  useEffect(() => {
    if (trackingMode === 'auto' && selectedOrders?.length > 0) {
      generateTrackingNos()
    }
  }, [trackingMode, trackingPrefix, selectedOrders])

  const generateTrackingNos = () => {
    const newNos = {}
    const now = new Date()
    const dateStr = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0')
    selectedOrders.forEach((order, idx) => {
      const suffix = (idx + 1).toString().padStart(4, '0')
      newNos[order.id] = trackingPrefix + dateStr + suffix
    })
    setTrackingNos(newNos)
  }

  const handleTrackingNoChange = (orderId, value) => {
    setTrackingNos((prev) => ({ ...prev, [orderId]: value }))
  }

  const handleSubmit = async () => {
    if (!selectedCompany) {
      showToast('请选择或填写物流公司', 'error')
      return
    }

    const items = selectedOrders.map((order) => ({
      order_id: order.id,
      tracking_no: trackingNos[order.id] || '',
      logistics_company: selectedCompany,
    }))

    const emptyTracking = items.filter((i) => !i.tracking_no.trim())
    if (emptyTracking.length > 0) {
      showToast(`有 ${emptyTracking.length} 个订单的运单号不能为空`, 'error')
      return
    }

    const ok = await confirm({
      title: '确认批量发货',
      message: `确定要对 ${selectedOrders.length} 个订单执行批量发货吗？物流公司：${selectedCompany}`,
      confirmText: '确认发货',
      tone: 'default',
    })
    if (!ok) return

    setSubmitting(true)
    try {
      const resultData = await batchShip(items)
      setResult(resultData)
      if (resultData.success_count > 0 && resultData.failed_count === 0) {
        showToast(`批量发货成功：${resultData.success_count} 单`, 'success')
      } else if (resultData.success_count > 0 && resultData.failed_count > 0) {
        showToast(`批量发货完成：成功 ${resultData.success_count} 单，失败 ${resultData.failed_count} 单`, 'warning')
      } else {
        showToast(`批量发货全部失败：${resultData.failed_count} 单`, 'error')
      }
      if (resultData.success_count > 0) {
        onSuccess?.(resultData)
      }
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!selectedOrders || selectedOrders.length === 0) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">批量发货</h2>
            <p className="text-sm text-gray-500 mt-0.5">已选择 {selectedOrders.length} 个待发货订单</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            disabled={submitting}
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">物流公司</span>
              <select
                value={logisticsCompany}
                onChange={(e) => setLogisticsCompany(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                disabled={submitting || result}
              >
                {LOGISTICS_COMPANIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            {logisticsCompany === '其他' && (
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">自定义公司名称</span>
                <input
                  type="text"
                  value={customCompany}
                  onChange={(e) => setCustomCompany(e.target.value)}
                  placeholder="请输入物流公司名称"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  disabled={submitting || result}
                />
              </label>
            )}
          </div>

          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
            <div className="flex items-center gap-4 mb-3">
              <span className="text-sm font-medium text-gray-700">运单号方式：</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={trackingMode === 'auto'}
                  onChange={() => setTrackingMode('auto')}
                  disabled={submitting || result}
                  className="text-primary"
                />
                <span className="text-sm text-gray-700">自动生成</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={trackingMode === 'manual'}
                  onChange={() => setTrackingMode('manual')}
                  disabled={submitting || result}
                  className="text-primary"
                />
                <span className="text-sm text-gray-700">手动填写</span>
              </label>
            </div>
            {trackingMode === 'auto' && (
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">运单号前缀：</label>
                <input
                  type="text"
                  value={trackingPrefix}
                  onChange={(e) => setTrackingPrefix(e.target.value.toUpperCase())}
                  placeholder="如 SF、YT"
                  maxLength={6}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  disabled={submitting || result}
                />
                <button
                  type="button"
                  onClick={generateTrackingNos}
                  disabled={submitting || result}
                  className="text-sm text-primary hover:text-primary-hover font-medium"
                >
                  重新生成
                </button>
              </div>
            )}
          </div>

          {result && (
            <div className={`border rounded-xl p-4 ${result.failed_count > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <h3 className="font-semibold text-gray-800 mb-2">
                批量发货结果
              </h3>
              <div className="flex gap-4 text-sm mb-3">
                <span className="text-emerald-700">成功：{result.success_count} 单</span>
                <span className="text-red-600">失败：{result.failed_count} 单</span>
                <span className="text-gray-600">总计：{result.total} 单</span>
              </div>
              {result.failed.length > 0 && (
                <div className="max-h-40 overflow-y-auto bg-white rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">订单号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">运单号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">失败原因</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {result.failed.map((f, idx) => (
                        <tr key={idx} className="bg-red-50">
                          <td className="px-3 py-2 text-gray-800">{f.order_no || f.order_id}</td>
                          <td className="px-3 py-2 text-gray-600">{f.tracking_no || '-'}</td>
                          <td className="px-3 py-2 text-red-600">{f.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-primary-light border-b border-orange-100">
              <h3 className="font-semibold text-gray-800">订单明细 ({selectedOrders.length} 单)</h3>
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 w-16">序号</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">订单号</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 w-28">金额</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">运单号</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedOrders.map((order, idx) => {
                    const isFailed = result?.failed?.some((f) => f.order_id === order.id)
                    const isSuccess = result?.success?.some((s) => s.order_id === order.id)
                    return (
                      <tr key={order.id} className={isFailed ? 'bg-red-50' : isSuccess ? 'bg-emerald-50' : 'hover:bg-orange-50'}>
                        <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium">{order.order_no}</td>
                        <td className="px-4 py-3 text-sm text-right text-primary font-medium">¥{Number(order.total_amount).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          {trackingMode === 'auto' ? (
                            <span className="text-sm text-gray-700 font-mono">{trackingNos[order.id] || '-'}</span>
                          ) : (
                            <input
                              type="text"
                              value={trackingNos[order.id] || ''}
                              onChange={(e) => handleTrackingNoChange(order.id, e.target.value)}
                              placeholder="请输入运单号"
                              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                              disabled={submitting || result}
                            />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-5 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
          >
            {result ? '关闭' : '取消'}
          </button>
          {!result && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !selectedCompany}
              className="bg-primary hover:bg-primary-hover disabled:bg-gray-300 text-white px-5 py-2 rounded-lg font-medium text-sm disabled:cursor-not-allowed"
            >
              {submitting ? '发货中...' : '确认批量发货'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
