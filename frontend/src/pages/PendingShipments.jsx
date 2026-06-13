import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getPendingOrders } from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../contexts/ToastContext'
import BatchShipDialog from '../components/BatchShipDialog'
import ImportTrackingDialog from '../components/ImportTrackingDialog'

const PER_PAGE = 15

export default function PendingShipments() {
  const { showToast } = useToast()
  const [res, setRes] = useState(null)
  const [err, setErr] = useState(null)
  const [page, setPage] = useState(1)
  const [orderNo, setOrderNo] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [appliedOrderNo, setAppliedOrderNo] = useState('')
  const [appliedDateFrom, setAppliedDateFrom] = useState('')
  const [appliedDateTo, setAppliedDateTo] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const load = (p = page) => {
    const params = { per_page: PER_PAGE, page: p }
    if (appliedOrderNo) params.order_no = appliedOrderNo
    if (appliedDateFrom) params.date_from = appliedDateFrom
    if (appliedDateTo) params.date_to = appliedDateTo
    return getPendingOrders(params).then(setRes).catch((e) => { setErr(e.message); showToast(e.message) })
  }

  useEffect(() => { load(page) }, [page, appliedOrderNo, appliedDateFrom, appliedDateTo])

  const handleSearch = (e) => {
    e?.preventDefault()
    setAppliedOrderNo(orderNo.trim())
    setAppliedDateFrom(dateFrom.trim())
    setAppliedDateTo(dateTo.trim())
    setPage(1)
    setSelectedIds(new Set())
  }

  const handleReset = () => {
    setOrderNo('')
    setDateFrom('')
    setDateTo('')
    setAppliedOrderNo('')
    setAppliedDateFrom('')
    setAppliedDateTo('')
    setPage(1)
    setSelectedIds(new Set())
  }

  const list = res?.data ?? res ?? []
  const total = res?.total ?? list.length
  const currentPage = res?.current_page ?? 1
  const lastPage = res?.last_page ?? 1

  const toggleSelect = (orderId) => {
    const next = new Set(selectedIds)
    if (next.has(orderId)) {
      next.delete(orderId)
    } else {
      next.add(orderId)
    }
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === list.length && list.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(list.map((o) => o.id)))
    }
  }

  const selectedOrders = list.filter((o) => selectedIds.has(o.id))

  const handleBatchSuccess = () => {
    setSelectedIds(new Set())
    load(page)
  }

  const handleImportSuccess = () => {
    setSelectedIds(new Set())
    load(page)
  }

  if (err) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load(page) }} className="text-primary hover:underline">重试</button></div>
  if (!res) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const hasSelection = selectedIds.size > 0

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">待发货工作台</h1>
          <p className="text-gray-500 text-sm mt-0.5">批量处理已付款待发货订单，支持批量发货与导入运单号</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/orders" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm shrink-0">全部订单</Link>
          <Link to="/shipments" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm shrink-0">运单管理</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl p-4 border border-amber-200 bg-amber-50">
          <p className="text-amber-600 text-xs font-medium">待发货订单</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{total}</p>
        </div>
        <div className="rounded-xl p-4 border border-gray-200 bg-white">
          <p className="text-gray-500 text-xs font-medium">已选中</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{selectedIds.size}</p>
        </div>
        <div className="rounded-xl p-4 border border-gray-200 bg-white">
          <p className="text-gray-500 text-xs font-medium">当前页</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{list.length}</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow border border-gray-100 p-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">订单号</span>
          <input
            type="text"
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            placeholder="输入订单号筛选"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">下单时间 起</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">下单时间 止</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </label>
        <div className="flex items-center gap-2">
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm">查询</button>
          <button type="button" onClick={handleReset} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm">重置</button>
        </div>
      </form>

      {hasSelection && (
        <div className="bg-primary-light border border-primary/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              已选择 <span className="text-primary font-bold">{selectedIds.size}</span> 个订单
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setImportDialogOpen(true)}
              className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm border border-gray-300"
            >
              📋 导入运单号
            </button>
            <button
              type="button"
              onClick={() => setBatchDialogOpen(true)}
              className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm"
            >
              🚚 批量发货
            </button>
          </div>
        </div>
      )}

      {!hasSelection && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              勾选订单后可批量发货，或直接导入运单号匹配发货
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setImportDialogOpen(true)}
              className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm"
            >
              📋 导入运单号发货
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        {list.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">暂无待发货订单</p>
            <p className="text-sm mt-1">所有已付款订单都已发货</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] divide-y divide-gray-200">
                <thead className="bg-primary-light">
                  <tr>
                    <th className="px-4 py-3 text-left w-12">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === list.length && list.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-primary rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">订单号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">商品明细</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">金额</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">下单时间</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {list.map((o) => (
                    <tr key={o.id} className={selectedIds.has(o.id) ? 'bg-blue-50' : 'hover:bg-orange-50'}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(o.id)}
                          onChange={() => toggleSelect(o.id)}
                          className="w-4 h-4 text-primary rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{o.order_no}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {o.items && o.items.length > 0 ? (
                          <div className="space-y-0.5">
                            {o.items.slice(0, 2).map((item) => (
                              <div key={item.id} className="truncate">
                                {item.product_name} × {item.quantity}
                              </div>
                            ))}
                            {o.items.length > 2 && (
                              <div className="text-xs text-gray-400">等 {o.items.length} 件商品</div>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-primary font-medium">¥{Number(o.total_amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to={'/orders/' + o.id} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded-lg font-medium text-sm inline-block">详情</Link>
                          <button
                            type="button"
                            onClick={() => { setSelectedIds(new Set([o.id])); setBatchDialogOpen(true) }}
                            className="bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-lg font-medium text-sm"
                          >
                            🚚 发货
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm text-gray-500">
                共 {total} 条待发货订单{(appliedOrderNo || appliedDateFrom || appliedDateTo) ? '（当前筛选）' : ''}
              </span>
              <Pagination currentPage={currentPage} lastPage={lastPage} total={total} onPageChange={(p) => { setPage(p); setSelectedIds(new Set()) }} />
            </div>
          </>
        )}
      </div>

      {batchDialogOpen && (
        <BatchShipDialog
          selectedOrders={selectedOrders}
          onClose={() => setBatchDialogOpen(false)}
          onSuccess={handleBatchSuccess}
        />
      )}

      {importDialogOpen && (
        <ImportTrackingDialog
          onClose={() => setImportDialogOpen(false)}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  )
}
