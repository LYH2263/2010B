import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPointAccountByUser, adjustPointsByUser } from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const sourceMap = { order: '消费获取', manual: '手动调整', order_refund: '订单取消回收' }
const typeMap = { earn: '获取', spend: '消费', adjust: '调整', refund: '回收' }
const typeClass = {
  earn: 'text-green-600',
  spend: 'text-red-600',
  adjust: 'text-blue-600',
  refund: 'text-orange-600',
}

const PER_PAGE = 10

export default function MemberShow() {
  const { userId } = useParams()
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjustType, setAdjustType] = useState('add')
  const [adjustPoints, setAdjustPoints] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = (p = page) => {
    const params = { per_page: PER_PAGE, page: p }
    if (typeFilter) params.type = typeFilter
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    return getPointAccountByUser(userId, params).then(setData).catch((e) => { setErr(e.message); showToast(e.message) })
  }

  useEffect(() => { load(page) }, [page, typeFilter, dateFrom, dateTo, userId])

  const handleSearch = (e) => {
    e?.preventDefault()
    setPage(1)
  }

  const handleReset = () => {
    setTypeFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const handleAdjust = async () => {
    const points = adjustType === 'add' ? Math.abs(parseInt(adjustPoints) || 0) : -Math.abs(parseInt(adjustPoints) || 0)
    if (points === 0) {
      showToast('请输入有效的积分数量')
      return
    }
    if (!adjustReason.trim()) {
      showToast('请填写调整原因')
      return
    }

    const ok = await confirm({
      title: '确认调整积分',
      message: `确定要为该会员${adjustType === 'add' ? '增加' : '扣减'} ${Math.abs(points)} 积分吗？`,
      confirmText: '确认调整',
      tone: adjustType === 'add' ? 'default' : 'danger',
    })
    if (!ok) return

    setSubmitting(true)
    try {
      await adjustPointsByUser(userId, points, adjustReason.trim())
      showToast('积分调整成功', 'success')
      setShowAdjustModal(false)
      setAdjustPoints('')
      setAdjustReason('')
      load(page)
    } catch (e) {
      showToast(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (err) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load(page) }} className="text-primary hover:underline">重试</button></div>
  if (!data) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const account = data.account
  const user = account?.user
  const level = account?.level
  const nextLevel = data.next_level
  const progress = data.progress_to_next ?? 100
  const pointsToNext = data.points_to_next ?? 0
  const transactions = data.transactions?.data ?? data.transactions ?? []
  const total = data.transactions?.total ?? transactions.length
  const currentPage = data.transactions?.current_page ?? 1
  const lastPage = data.transactions?.last_page ?? 1

  return (
    <div className="space-y-4">
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <Link to="/points" className="hover:text-primary">积分管理</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-800">会员详情</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">会员详情</h1>
            <p className="text-gray-500 text-sm mt-0.5">查看会员积分、等级与流水明细</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdjustModal(true)}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm shrink-0"
          >
            手动调整积分
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">{user?.name || '未知用户'}</h2>
              <p className="text-sm text-gray-500">{user?.email || '-'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-primary">{account?.balance ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">当前积分</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{account?.total_earned ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">累计获取</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{account?.total_spent ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">累计扣减</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">当前等级：</span>
                {level ? (
                  <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: level.color + '20', color: level.color }}>
                    {level.name}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">无</span>
                )}
              </div>
              {nextLevel && (
                <span className="text-sm text-gray-500">距 {nextLevel.name} 还需 {pointsToNext} 积分</span>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="h-4 rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  backgroundColor: level?.color || '#3b82f6',
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">{level?.name || '普通会员'}</span>
              <span className="text-xs font-medium text-gray-700">{progress}%</span>
              <span className="text-xs text-gray-500">{nextLevel?.name || '已达最高等级'}</span>
            </div>
            {level?.benefits && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs font-medium text-blue-800 mb-1">当前等级权益</p>
                <p className="text-sm text-blue-700">{level.benefits}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">等级说明</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">普通会员</span>
              <span className="text-xs text-gray-500">0 积分起</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">银卡会员</span>
              <span className="text-xs text-gray-500">1,000 积分起</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">金卡会员</span>
              <span className="text-xs text-gray-500">5,000 积分起</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">钻石会员</span>
              <span className="text-xs text-gray-500">20,000 积分起</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-800">积分流水明细</h3>
          <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-600">类型</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm min-w-[100px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
              >
                <option value="">全部</option>
                <option value="earn">获取</option>
                <option value="spend">消费</option>
                <option value="adjust">调整</option>
                <option value="refund">回收</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-600">日期 起</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-600">日期 止</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </label>
            <div className="flex items-center gap-2">
              <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-lg font-medium text-sm">查询</button>
              <button type="button" onClick={handleReset} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded-lg font-medium text-sm">重置</button>
            </div>
          </form>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">暂无流水记录</p>
            <p className="text-sm mt-1">积分变动后将在此处显示</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">时间</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">类型</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">来源</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">变动</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">结存</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">原因/备注</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作人</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {t.created_at ? new Date(t.created_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${typeClass[t.type] || ''}`}>
                          {typeMap[t.type] || t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {sourceMap[t.source_type] || t.source_type}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold ${t.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {t.delta > 0 ? '+' : ''}{t.delta}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{t.balance_after}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={t.reason || ''}>
                        {t.reason || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {t.operator?.name || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm text-gray-500">共 {total} 条记录</span>
              <Pagination currentPage={currentPage} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
            </div>
          </>
        )}
      </div>

      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">调整会员积分</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">调整方式</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustType('add')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm border-2 transition-colors ${
                      adjustType === 'add'
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    增加积分
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('subtract')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm border-2 transition-colors ${
                      adjustType === 'subtract'
                        ? 'bg-red-50 border-red-500 text-red-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    扣减积分
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">积分数量</label>
                <input
                  type="number"
                  min="1"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(e.target.value)}
                  placeholder="请输入积分数量"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">调整原因</label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="请填写调整原因，将记录在流水中"
                  rows={3}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowAdjustModal(false); setAdjustPoints(''); setAdjustReason('') }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm"
                disabled={submitting}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAdjust}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${
                  adjustType === 'add'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
                disabled={submitting}
              >
                {submitting ? '提交中...' : '确认调整'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
