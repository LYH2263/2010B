import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getBestsellers } from '../api'
import { useToast } from '../contexts/ToastContext'

const PRESET_OPTIONS = [
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' },
  { value: 'custom', label: '自定义' },
]

const SORT_OPTIONS = [
  { value: 'quantity', label: '按销量数量' },
  { value: 'amount', label: '按销售额' },
]

const LIMIT_OPTIONS = [10, 20, 50]

const rankBadge = (rank) => {
  if (rank === 1) return 'bg-yellow-400 text-yellow-900'
  if (rank === 2) return 'bg-gray-300 text-gray-700'
  if (rank === 3) return 'bg-amber-600 text-white'
  return 'bg-gray-100 text-gray-600'
}

export default function BestsellerList() {
  const { showToast } = useToast()
  const [res, setRes] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)

  const [preset, setPreset] = useState('7d')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [appliedDateFrom, setAppliedDateFrom] = useState('')
  const [appliedDateTo, setAppliedDateTo] = useState('')
  const [sortBy, setSortBy] = useState('quantity')
  const [limit, setLimit] = useState(10)

  const load = useCallback(() => {
    setLoading(true)
    setErr(null)
    const params = { preset, sort_by: sortBy, limit }
    if (preset === 'custom') {
      if (appliedDateFrom) params.date_from = appliedDateFrom
      if (appliedDateTo) params.date_to = appliedDateTo
    }
    getBestsellers(params)
      .then((data) => setRes(data))
      .catch((e) => {
        setErr(e.message)
        showToast(e.message)
      })
      .finally(() => setLoading(false))
  }, [preset, sortBy, limit, appliedDateFrom, appliedDateTo])

  useEffect(() => { load() }, [load])

  const handleApplyCustom = (e) => {
    e?.preventDefault()
    if (!dateFrom || !dateTo) {
      showToast('请选择完整的起止日期', 'error')
      return
    }
    setAppliedDateFrom(dateFrom)
    setAppliedDateTo(dateTo)
  }

  const handlePresetChange = (val) => {
    setPreset(val)
    if (val !== 'custom') {
      setAppliedDateFrom('')
      setAppliedDateTo('')
      setDateFrom('')
      setDateTo('')
    }
  }

  if (err && !res) {
    return (
      <div className="p-4 text-center text-gray-600">
        加载失败，请{' '}
        <button type="button" onClick={load} className="text-primary hover:underline">重试</button>
      </div>
    )
  }

  const list = res?.data ?? []
  const meta = res?.meta ?? {}

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">畅销榜</h1>
          <p className="text-gray-500 text-sm mt-0.5">统计营业额口径订单的畅销商品，辅助补货与选品决策</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-100 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">时间区间</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {PRESET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handlePresetChange(opt.value)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    preset === opt.value
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {preset === 'custom' && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600">开始日期</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600">结束日期</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </label>
              <button
                type="button"
                onClick={handleApplyCustom}
                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm"
              >
                查询
              </button>
            </>
          )}

          <div className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">排序口径</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSortBy(opt.value)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    sortBy === opt.value
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Top N</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {LIMIT_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLimit(n)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    limit === n
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
          {list.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-lg">所选区间内暂无销售数据</p>
              <p className="text-sm mt-1">请调整时间区间或稍后再试</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] divide-y divide-gray-200">
                <thead className="bg-primary-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-16">名次</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">商品名</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">SKU</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">所属分类</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">销量</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">销售额</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">当前库存</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {list.map((item) => (
                    <tr
                      key={item.product_id}
                      className={`hover:bg-orange-50 ${item.low_stock ? 'bg-red-50/60' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${rankBadge(item.rank)}`}>
                          {item.rank}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        <Link to={`/products/${item.product_id}`} className="hover:text-primary hover:underline">
                          {item.product_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.sku || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.category_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-800">{item.total_quantity}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-primary">¥{Number(item.total_amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        {item.low_stock ? (
                          <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                            {item.current_stock}
                            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">缺货风险</span>
                          </span>
                        ) : (
                          <span className="text-gray-600">{item.current_stock}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!loading && list.length > 0 && meta.date_from && (
        <div className="text-center text-xs text-gray-400">
          统计区间：{meta.date_from?.substring(0, 10)} ~ {meta.date_to?.substring(0, 10)}｜排序：{sortBy === 'quantity' ? '销量数量' : '销售额'}｜库存预警阈值 ≤ {meta.stock_threshold}
        </div>
      )}
    </div>
  )
}
