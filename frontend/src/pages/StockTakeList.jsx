import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getStockTakes, createStockTake } from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const statusMap = { pending: '盘点中', completed: '已完成' }
const statusClass = { pending: 'bg-amber-100 text-amber-800', completed: 'bg-emerald-100 text-emerald-800' }

const PER_PAGE = 15

export default function StockTakeList() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [res, setRes] = useState(null)
  const [err, setErr] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')

  const load = (p = page) => {
    const params = { per_page: PER_PAGE, page: p }
    if (statusFilter) params.status = statusFilter
    if (appliedKeyword) params.keyword = appliedKeyword
    return getStockTakes(params).then(setRes).catch((e) => { setErr(e.message); showToast(e.message) })
  }

  useEffect(() => { load(page) }, [page, statusFilter, appliedKeyword])

  const handleSearch = (e) => {
    e?.preventDefault()
    setAppliedKeyword(keyword.trim())
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setAppliedKeyword('')
    setPage(1)
  }

  const handleCreate = async () => {
    const ok = await confirm({
      title: '创建盘点单',
      message: '确定要创建新的盘点单吗？系统将快照当前所有上架商品的账面库存。',
      confirmText: '确认创建',
      tone: 'default',
    })
    if (!ok) return
    createStockTake({})
      .then((data) => {
        showToast('盘点单已创建', 'success')
        navigate('/stock-takes/' + data.id)
      })
      .catch((e) => showToast(e.message))
  }

  if (err) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load(page) }} className="text-primary hover:underline">重试</button></div>
  if (!res) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const paginator = res.stock_takes
  const list = paginator?.data ?? (Array.isArray(res.stock_takes) ? res.stock_takes : [])
  const stats = res.stats ?? {}
  const total = paginator?.total ?? list.length
  const currentPage = paginator?.current_page ?? 1
  const lastPage = paginator?.last_page ?? 1

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">库存盘点</h1>
          <p className="text-gray-500 text-sm mt-0.5">定期盘点库存，核对账面与实盘数量并调整差异</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreate}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium shrink-0"
          >
            + 新建盘点单
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <p className="text-gray-500 text-sm">盘点单总数</p>
          <p className="text-2xl font-bold text-primary mt-1">{stats.total_count ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">历史累计盘点单数量</p>
        </div>
        <button
          type="button"
          onClick={() => { setStatusFilter('pending'); setPage(1) }}
          className={`bg-white rounded-xl shadow-md p-6 border text-left ${statusFilter === 'pending' ? 'border-amber-400' : 'border-gray-100 hover:border-amber-200'}`}
        >
          <p className="text-gray-500 text-sm">盘点中</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending_count ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">正在进行中的盘点单</p>
        </button>
        <button
          type="button"
          onClick={() => { setStatusFilter('completed'); setPage(1) }}
          className={`bg-white rounded-xl shadow-md p-6 border text-left ${statusFilter === 'completed' ? 'border-emerald-400' : 'border-gray-100 hover:border-emerald-200'}`}
        >
          <p className="text-gray-500 text-sm">已完成</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.completed_count ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">已完成的盘点单</p>
        </button>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow border border-gray-100 p-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">盘点单号</span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="输入盘点单号"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[160px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">状态</span>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[120px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
          >
            <option value="">全部</option>
            <option value="pending">盘点中</option>
            <option value="completed">已完成</option>
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm">查询</button>
          <button type="button" onClick={handleReset} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm">重置</button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        {list.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">暂无盘点单</p>
            <p className="text-sm mt-1">点击右上角「新建盘点单」开始盘点</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] divide-y divide-gray-200">
                <thead className="bg-primary-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">盘点单号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">备注</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作人</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">创建时间</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">完成时间</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {list.map((s) => (
                    <tr key={s.id} className="hover:bg-orange-50">
                      <td className="px-4 py-3 text-sm font-medium">{s.stock_take_no}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusClass[s.status] || 'bg-gray-100 text-gray-800'}`}>
                          {statusMap[s.status] || s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[180px]">
                        {s.remark || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {s.operator?.name || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {s.created_at ? new Date(s.created_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {s.completed_at ? new Date(s.completed_at).toLocaleString() : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Link to={'/stock-takes/' + s.id} className="text-primary hover:underline">
                          {s.status === 'pending' ? '录入盘点' : '查看详情'}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm text-gray-500">共 {total} 条盘点单{(statusFilter || appliedKeyword) ? '（当前筛选）' : ''}</span>
              <Pagination currentPage={currentPage} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
