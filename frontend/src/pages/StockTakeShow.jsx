import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getStockTake, updateStockTakeItem, completeStockTake } from '../api'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const statusMap = { pending: '盘点中', completed: '已完成' }
const statusClass = { pending: 'bg-amber-100 text-amber-800', completed: 'bg-emerald-100 text-emerald-800' }

export default function StockTakeShow() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [stockTake, setStockTake] = useState(null)
  const [err, setErr] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [diffOnly, setDiffOnly] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [editValue, setEditValue] = useState('')

  const load = () => getStockTake(id).then(setStockTake).catch((e) => { setErr(e.message); showToast(e.message) })

  useEffect(() => { load() }, [id])

  const handleEdit = (item) => {
    if (stockTake?.status !== 'pending') return
    setEditingItem(item.id)
    setEditValue(item.actual_quantity !== null ? String(item.actual_quantity) : '')
  }

  const handleSave = async (itemId) => {
    const val = editValue.trim()
    if (val === '') {
      try {
        const updated = await updateStockTakeItem(stockTake.id, itemId, null)
        const newItems = stockTake.items.map((i) => i.id === itemId ? { ...i, actual_quantity: updated.actual_quantity, difference: updated.difference } : i)
        setStockTake({ ...stockTake, items: newItems })
        setEditingItem(null)
        showToast('已清空实盘数量', 'success')
      } catch (e) {
        showToast(e.message)
      }
      return
    }

    const qty = parseInt(val, 10)
    if (isNaN(qty) || qty < 0) {
      showToast('请输入有效的数量（≥ 0）')
      return
    }

    try {
      const updated = await updateStockTakeItem(stockTake.id, itemId, qty)
      const newItems = stockTake.items.map((i) => i.id === itemId ? { ...i, actual_quantity: updated.actual_quantity, difference: updated.difference } : i)
      setStockTake({ ...stockTake, items: newItems })
      setEditingItem(null)
      showToast('实盘数量已更新', 'success')
    } catch (e) {
      showToast(e.message)
    }
  }

  const handleComplete = async () => {
    const ok = await confirm({
      title: '完成盘点',
      message: '确定要完成本次盘点吗？完成后将按差异调整商品库存，且盘点单不可再修改。',
      confirmText: '确认完成',
      tone: 'default',
    })
    if (!ok) return

    try {
      await completeStockTake(stockTake.id)
      showToast('盘点已完成，库存已调整', 'success')
      load()
    } catch (e) {
      showToast(e.message)
    }
  }

  if (err && !stockTake) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load() }} className="text-primary hover:underline">重试</button></div>
  if (!stockTake) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const items = stockTake.items ?? []
  const isPending = stockTake.status === 'pending'

  const filteredItems = items.filter((item) => {
    if (diffOnly && item.difference === 0) return false
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase()
      const product = item.product ?? {}
      if (product.name?.toLowerCase().includes(kw)) return true
      if (product.sku?.toLowerCase().includes(kw)) return true
      return false
    }
    return true
  })

  const surplusCount = items.filter((i) => i.difference > 0).length
  const shortageCount = items.filter((i) => i.difference < 0).length
  const matchCount = items.filter((i) => i.difference === 0 && i.actual_quantity !== null).length
  const uncountedCount = items.filter((i) => i.actual_quantity === null).length

  const totalDiff = items.reduce((sum, i) => sum + i.difference, 0)
  const totalBookQty = items.reduce((sum, i) => sum + i.book_quantity, 0)
  const totalActualQty = items.reduce((sum, i) => sum + (i.actual_quantity ?? 0), 0)

  const getRowClass = (item) => {
    if (item.difference > 0) return 'bg-green-50 hover:bg-green-100/80'
    if (item.difference < 0) return 'bg-red-50 hover:bg-red-100/80'
    return 'hover:bg-orange-50'
  }

  const getDiffClass = (item) => {
    if (item.difference > 0) return 'text-green-600 font-bold'
    if (item.difference < 0) return 'text-red-600 font-bold'
    return 'text-gray-500'
  }

  const getDiffLabel = (item) => {
    if (item.difference > 0) return '盘盈'
    if (item.difference < 0) return '盘亏'
    return '一致'
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav className="text-sm text-gray-500 mb-2">
            <Link to="/stock-takes" className="hover:text-primary">库存盘点</Link>
            <span className="mx-1">/</span>
            <span className="text-gray-800">盘点详情</span>
          </nav>
          <h1 className="text-xl font-bold text-gray-800">盘点单详情</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isPending ? '录入各商品实盘数量，完成后提交盘点' : '查看盘点结果，盘盈/盘亏已高亮显示'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/stock-takes" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium">返回列表</Link>
          {isPending && (
            <button
              type="button"
              onClick={handleComplete}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              ✓ 完成盘点
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-primary-light border-b border-orange-100 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-gray-800">盘点单信息</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusClass[stockTake.status] || 'bg-gray-100'}`}>
            {statusMap[stockTake.status] || stockTake.status}
          </span>
        </div>
        <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div><dt className="text-gray-500 text-sm">盘点单号</dt><dd className="font-semibold text-gray-800 mt-0.5">{stockTake.stock_take_no}</dd></div>
          <div><dt className="text-gray-500 text-sm">操作人</dt><dd className="mt-0.5 text-gray-700">{stockTake.operator?.name || <span className="text-gray-400">-</span>}</dd></div>
          <div><dt className="text-gray-500 text-sm">创建时间</dt><dd className="mt-0.5 text-gray-700">{stockTake.created_at ? new Date(stockTake.created_at).toLocaleString() : '-'}</dd></div>
          <div><dt className="text-gray-500 text-sm">完成时间</dt><dd className="mt-0.5 text-gray-700">{stockTake.completed_at ? new Date(stockTake.completed_at).toLocaleString() : <span className="text-gray-400">-</span>}</dd></div>
          {stockTake.remark && <div className="sm:col-span-2"><dt className="text-gray-500 text-sm">备注</dt><dd className="mt-0.5 text-gray-700">{stockTake.remark}</dd></div>}
        </dl>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
          <p className="text-gray-500 text-xs">商品总数</p>
          <p className="text-xl font-bold text-gray-800 mt-1">{items.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">账面总数：{totalBookQty}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
          <p className="text-gray-500 text-xs">账实一致</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{matchCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">已盘点：{items.length - uncountedCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-green-200 bg-green-50/50">
          <p className="text-green-600 text-xs font-medium">盘盈商品</p>
          <p className="text-xl font-bold text-green-600 mt-1">{surplusCount}</p>
          <p className="text-xs text-green-500 mt-0.5">盘盈数量：+{totalDiff > 0 ? totalDiff : 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-red-200 bg-red-50/50">
          <p className="text-red-600 text-xs font-medium">盘亏商品</p>
          <p className="text-xl font-bold text-red-600 mt-1">{shortageCount}</p>
          <p className="text-xs text-red-500 mt-0.5">盘亏数量：{totalDiff < 0 ? totalDiff : 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        <div className="px-4 py-3 bg-primary-light border-b border-orange-100 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-800">盘点明细（{filteredItems.length} 项）</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索商品名称 / SKU"
                className="border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm w-[180px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
            </div>
            <label className="flex items-center gap-2 h-[36px]">
              <input
                type="checkbox"
                checked={diffOnly}
                onChange={(e) => setDiffOnly(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600">仅显示差异</span>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-16">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">商品</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">SKU</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 w-28">账面数量</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 w-36">实盘数量</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 w-28">差异</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-24">结果</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    {diffOnly ? '没有差异商品' : '暂无商品'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const product = item.product ?? {}
                  const isEditing = editingItem === item.id

                  return (
                    <tr key={item.id} className={getRowClass(item)}>
                      <td className="px-4 py-3 text-sm text-gray-500">{product.id ?? '-'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{product.name ?? '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">{product.sku ?? '-'}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-700">{item.book_quantity}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave(item.id)
                                if (e.key === 'Escape') { setEditingItem(null); setEditValue('') }
                              }}
                              className="w-20 border border-primary rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                              min="0"
                            />
                            <button type="button" onClick={() => handleSave(item.id)} className="text-primary hover:text-primary-hover text-sm font-medium">确定</button>
                            <button type="button" onClick={() => { setEditingItem(null); setEditValue('') }} className="text-gray-400 hover:text-gray-600 text-sm">取消</button>
                          </div>
                        ) : (
                          <div
                            className={`inline-flex items-center justify-end w-full ${isPending ? 'cursor-pointer' : ''}`}
                            onClick={() => isPending && handleEdit(item)}
                          >
                            {item.actual_quantity !== null ? (
                              <span className="font-medium text-gray-800">{item.actual_quantity}</span>
                            ) : (
                              <span className="text-gray-400 italic">
                                {isPending ? '点击录入' : '未盘点'}
                              </span>
                            )}
                            {isPending && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 ml-1 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                            )}
                          </div>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right ${getDiffClass(item)}`}>
                        {item.actual_quantity !== null
                          ? (item.difference > 0 ? '+' : '') + item.difference
                          : <span className="text-gray-400">-</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.actual_quantity !== null ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            item.difference > 0 ? 'bg-green-100 text-green-700' :
                            item.difference < 0 ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {getDiffLabel(item)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500">
          <div>
            {isPending && <span>💡 点击「实盘数量」列可录入数据，按 Enter 确认</span>}
            {!isPending && <span>✓ 盘点已完成，数据不可修改</span>}
          </div>
          <div>
            已盘点 {items.length - uncountedCount} / {items.length}
            {uncountedCount > 0 && <span className="text-amber-600 ml-2">（{uncountedCount} 项未盘点）</span>}
          </div>
        </div>
      </div>

      {isPending && (
        <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">操作</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleComplete}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-medium"
            >
              ✓ 完成盘点并调整库存
            </button>
            <button
              type="button"
              onClick={() => navigate('/stock-takes')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2 rounded-lg font-medium"
            >
              返回列表
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
