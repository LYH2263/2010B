import { useState, useEffect } from 'react'
import { previewPriceChange, batchUpdatePrice } from '../api'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

export default function BatchPriceChange({ selectedProducts, onClose, onSuccess }) {
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [changeType, setChangeType] = useState('fixed')
  const [direction, setDirection] = useState('up')
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const canPreview = selectedProducts && selectedProducts.length > 0 && value !== '' && parseFloat(value) >= 0

  const handlePreview = async () => {
    if (!canPreview) return
    setLoading(true)
    try {
      const data = await previewPriceChange({
        product_ids: selectedProducts.map((p) => p.id),
        change_type: changeType,
        value: parseFloat(value),
        direction,
      })
      setPreview(data.preview)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPreview(null)
  }, [changeType, direction, value, selectedProducts])

  const handleSubmit = async () => {
    if (!preview) return

    const ok = await confirm({
      title: '确认批量改价',
      message: `确定要对 ${selectedProducts.length} 个商品执行改价吗？此操作不可撤销。`,
      confirmText: '确认改价',
      tone: 'danger',
    })
    if (!ok) return

    setSubmitting(true)
    try {
      const result = await batchUpdatePrice({
        product_ids: selectedProducts.map((p) => p.id),
        change_type: changeType,
        value: parseFloat(value),
        direction,
        reason: reason.trim() || null,
      })
      showToast(`改价完成：成功 ${result.success} 个，失败 ${result.failed} 个`, result.failed > 0 ? 'warning' : 'success')
      onSuccess?.(result)
      onClose?.()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const hasInvalid = preview?.some((p) => !p.valid)
  const typeLabel = {
    fixed: '统一设为固定价',
    percentage: '按百分比涨/跌',
    amount: '按固定金额涨/跌',
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">批量改价</h2>
            <p className="text-sm text-gray-500 mt-0.5">已选择 {selectedProducts?.length ?? 0} 个商品</p>
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

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">调价方式</span>
              <select
                value={changeType}
                onChange={(e) => setChangeType(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                disabled={submitting}
              >
                <option value="fixed">统一设为固定价</option>
                <option value="percentage">按百分比涨/跌</option>
                <option value="amount">按固定金额涨/跌</option>
              </select>
            </label>

            {changeType !== 'fixed' && (
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">方向</span>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                  disabled={submitting}
                >
                  <option value="up">涨价</option>
                  <option value="down">降价</option>
                </select>
              </label>
            )}

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">
                {changeType === 'fixed' ? '目标价格（元）' : changeType === 'percentage' ? '百分比（%）' : '金额（元）'}
              </span>
              <input
                type="number"
                min="0"
                step={changeType === 'percentage' ? '1' : '0.01'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={changeType === 'fixed' ? '请输入目标价格' : changeType === 'percentage' ? '如：10 表示 10%' : '如：5 表示 5 元'}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                disabled={submitting}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">调价原因（可选）</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请输入调价原因，便于后续追溯"
              rows={2}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              disabled={submitting}
            />
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handlePreview}
              disabled={!canPreview || loading || submitting}
              className="bg-primary hover:bg-primary-hover disabled:bg-gray-300 text-white px-5 py-2 rounded-lg font-medium text-sm disabled:cursor-not-allowed"
            >
              {loading ? '计算中...' : '预览调价结果'}
            </button>
          </div>

          {preview && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-primary-light border-b border-orange-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">调价预览</h3>
                {hasInvalid && <span className="text-sm text-red-600 font-medium">⚠️ 部分商品调价后价格为负，将无法执行</span>}
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">商品</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">SKU</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">原价</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">调价</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">新价</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">幅度</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.map((p) => (
                      <tr key={p.id} className={!p.valid ? 'bg-red-50' : 'hover:bg-orange-50'}>
                        <td className="px-4 py-3 text-sm">{p.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{p.sku}</td>
                        <td className="px-4 py-3 text-sm text-right">¥{Number(p.old_price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={p.change_amount > 0 ? 'text-red-600' : p.change_amount < 0 ? 'text-green-600' : 'text-gray-400'}>
                            {p.change_amount > 0 ? '↑' : p.change_amount < 0 ? '↓' : '→'}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${!p.valid ? 'text-red-600' : 'text-primary'}`}>
                          ¥{Number(p.new_price).toFixed(2)}
                          {!p.valid && <span className="text-xs text-red-500 ml-1">（无效）</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className={p.change_amount > 0 ? 'text-red-600' : p.change_amount < 0 ? 'text-green-600' : 'text-gray-400'}>
                            {p.change_amount > 0 ? '+' : ''}{Number(p.change_amount).toFixed(2)}
                            <span className="text-xs ml-1">({p.change_percent > 0 ? '+' : ''}{Number(p.change_percent).toFixed(2)}%)</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-5 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!preview || hasInvalid || submitting}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white px-5 py-2 rounded-lg font-medium text-sm disabled:cursor-not-allowed"
          >
            {submitting ? '提交中...' : '确认提交'}
          </button>
        </div>
      </div>
    </div>
  )
}
