import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getShipments, updateShipmentStatus } from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const statusMap = { pending: '待发货', shipped: '已发货', in_transit: '运输中', delivered: '已签收' }
const statusClass = { pending: 'bg-amber-100 text-amber-800', shipped: 'bg-blue-100 text-blue-800', in_transit: 'bg-purple-100 text-purple-800', delivered: 'bg-emerald-100 text-emerald-800' }

const PER_PAGE = 15

export default function ShipmentList() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [res, setRes] = useState(null)
  const [err, setErr] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [trackingNo, setTrackingNo] = useState('')
  const [logisticsCompany, setLogisticsCompany] = useState('')
  const [orderNo, setOrderNo] = useState('')
  const [appliedTrackingNo, setAppliedTrackingNo] = useState('')
  const [appliedLogisticsCompany, setAppliedLogisticsCompany] = useState('')
  const [appliedOrderNo, setAppliedOrderNo] = useState('')

  const load = (p = page) => {
    const params = { per_page: PER_PAGE, page: p }
    if (statusFilter) params.status = statusFilter
    if (appliedTrackingNo) params.tracking_no = appliedTrackingNo
    if (appliedLogisticsCompany) params.logistics_company = appliedLogisticsCompany
    if (appliedOrderNo) params.order_no = appliedOrderNo
    return getShipments(params).then(setRes).catch((e) => { setErr(e.message); showToast(e.message) })
  }

  useEffect(() => { load(page) }, [page, statusFilter, appliedTrackingNo, appliedLogisticsCompany, appliedOrderNo])

  const handleSearch = (e) => {
    e?.preventDefault()
    setAppliedTrackingNo(trackingNo.trim())
    setAppliedLogisticsCompany(logisticsCompany.trim())
    setAppliedOrderNo(orderNo.trim())
    setPage(1)
  }

  const handleReset = () => {
    setTrackingNo('')
    setLogisticsCompany('')
    setOrderNo('')
    setAppliedTrackingNo('')
    setAppliedLogisticsCompany('')
    setAppliedOrderNo('')
    setPage(1)
  }

  if (err) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load(page) }} className="text-primary hover:underline">重试</button></div>
  if (!res) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const list = res.data ?? res
  const counts = res.status_counts || {}
  const totalAll = (counts.pending || 0) + (counts.shipped || 0) + (counts.in_transit || 0) + (counts.delivered || 0)
  const total = res.total ?? list.length
  const currentPage = res.current_page ?? 1
  const lastPage = res.last_page ?? 1

  const handleStatus = async (shipmentId, status) => {
    const ok = await confirm({
      title: '更新运单状态',
      message: `确定要将运单状态更新为「${statusMap[status] || status}」吗？`,
      confirmText: '确认更新',
      tone: status === 'delivered' ? 'default' : 'default',
    })
    if (!ok) return
    updateShipmentStatus(shipmentId, status).then(() => { showToast('运单状态已更新', 'success'); load(page) }).catch((e) => showToast(e.message))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">运单管理</h1>
          <p className="text-gray-500 text-sm mt-0.5">管理全部运单，可查看物流轨迹</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/orders" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium shrink-0">订单列表</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => { setStatusFilter(''); setPage(1) }}
          className={`rounded-xl p-4 text-left border ${!statusFilter ? 'border-primary bg-primary-light' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
        >
          <p className="text-gray-500 text-xs">全部运单</p>
          <p className="text-lg font-bold text-gray-800">{totalAll}</p>
        </button>
        <button type="button" onClick={() => { setStatusFilter('pending'); setPage(1) }} className={`rounded-xl p-4 text-left border ${statusFilter === 'pending' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
          <p className="text-gray-500 text-xs">待发货</p>
          <p className="text-lg font-bold text-amber-700">{counts.pending || 0}</p>
        </button>
        <button type="button" onClick={() => { setStatusFilter('shipped'); setPage(1) }} className={`rounded-xl p-4 text-left border ${statusFilter === 'shipped' ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
          <p className="text-gray-500 text-xs">已发货</p>
          <p className="text-lg font-bold text-blue-700">{counts.shipped || 0}</p>
        </button>
        <button type="button" onClick={() => { setStatusFilter('in_transit'); setPage(1) }} className={`rounded-xl p-4 text-left border ${statusFilter === 'in_transit' ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
          <p className="text-gray-500 text-xs">运输中</p>
          <p className="text-lg font-bold text-purple-700">{counts.in_transit || 0}</p>
        </button>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow border border-gray-100 p-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">运单号</span>
          <input
            type="text"
            value={trackingNo}
            onChange={(e) => setTrackingNo(e.target.value)}
            placeholder="输入运单号"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">物流公司</span>
          <input
            type="text"
            value={logisticsCompany}
            onChange={(e) => setLogisticsCompany(e.target.value)}
            placeholder="输入物流公司"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">订单号</span>
          <input
            type="text"
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            placeholder="输入订单号"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </label>
        <div className="flex items-center gap-2">
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm">查询</button>
          <button type="button" onClick={handleReset} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm">重置</button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        {list.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">暂无运单</p>
            <p className="text-sm mt-1">订单发货后将生成运单</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] divide-y divide-gray-200">
                <thead className="bg-primary-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">运单号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">物流公司</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">关联订单</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">发货时间</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">轨迹</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {list.map((s) => (
                    <tr key={s.id} className="hover:bg-orange-50">
                      <td className="px-4 py-3 text-sm font-medium">{s.tracking_no}</td>
                      <td className="px-4 py-3 text-sm">{s.logistics_company}</td>
                      <td className="px-4 py-3 text-sm">
                        {s.order ? (
                          <Link to={'/orders/' + s.order.id} className="text-primary hover:underline">
                            {s.order.order_no}
                          </Link>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${statusClass[s.status] || 'bg-gray-100'}`}>{statusMap[s.status] || s.status}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.shipped_at ? new Date(s.shipped_at).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.tracks?.length || 0} 条</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to={'/shipments/' + s.id} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded-lg font-medium text-sm inline-block">详情</Link>
                          {s.order && (s.order.status === 'pending' || s.order.status === 'paid') && (
                            <button
                              type="button"
                              onClick={() => navigate('/orders/' + s.order.id)}
                              className="bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-lg font-medium text-sm"
                            >
                              去发货
                            </button>
                          )}
                          {(s.status === 'shipped' || s.status === 'in_transit') && (
                            <button
                              type="button"
                              onClick={() => handleStatus(s.id, 'delivered')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium text-sm"
                            >
                              标记签收
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm text-gray-500">共 {total} 条运单{(statusFilter || appliedTrackingNo || appliedLogisticsCompany || appliedOrderNo) ? '（当前筛选）' : ''}</span>
              <Pagination currentPage={currentPage} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
