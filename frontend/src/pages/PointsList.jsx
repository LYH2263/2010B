import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getPoints } from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../contexts/ToastContext'

const typeMap = { earn: '获取', spend: '消费', adjust: '调整', refund: '回收' }
const typeClass = {
  earn: 'bg-green-100 text-green-800',
  spend: 'bg-red-100 text-red-800',
  adjust: 'bg-blue-100 text-blue-800',
  refund: 'bg-orange-100 text-orange-800',
}

const PER_PAGE = 15

export default function PointsList() {
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [levelId, setLevelId] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [appliedLevelId, setAppliedLevelId] = useState('')

  const load = (p = page) => {
    const params = { per_page: PER_PAGE, page: p }
    if (appliedKeyword) params.keyword = appliedKeyword
    if (appliedLevelId) params.level_id = appliedLevelId
    return getPoints(params).then(setData).catch((e) => { setErr(e.message); showToast(e.message) })
  }

  useEffect(() => { load(page) }, [page, appliedKeyword, appliedLevelId])

  const handleSearch = (e) => {
    e?.preventDefault()
    setAppliedKeyword(keyword.trim())
    setAppliedLevelId(levelId)
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setLevelId('')
    setAppliedKeyword('')
    setAppliedLevelId('')
    setPage(1)
  }

  if (err) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load(page) }} className="text-primary hover:underline">重试</button></div>
  if (!data) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const accounts = data.data ?? (Array.isArray(data) ? data : [])
  const stats = data.stats ?? {}
  const levels = data.levels ?? []
  const ranking = data.ranking ?? []
  const levelDist = stats.level_distribution ?? []
  const total = data.total ?? accounts.length
  const currentPage = data.current_page ?? 1
  const lastPage = data.last_page ?? 1

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">积分管理</h1>
        <p className="text-gray-500 text-sm mt-0.5">管理会员积分账户、查看积分排行与等级分布</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <p className="text-gray-500 text-sm">会员账户总数</p>
          <p className="text-2xl font-bold text-primary mt-1">{stats.total_accounts ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">已开通积分账户的会员数</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <p className="text-gray-500 text-sm">积分总余额</p>
          <p className="text-2xl font-bold text-primary mt-1">{stats.total_points ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">所有会员当前积分合计</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <p className="text-gray-500 text-sm">累计发放积分</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.total_earned ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">历史累计发放积分总数</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <p className="text-gray-500 text-sm">平均积分</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{Number(stats.avg_balance ?? 0).toFixed(0)}</p>
          <p className="text-xs text-gray-400 mt-1">会员平均持有积分数</p>
        </div>
      </div>

      {ranking.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">积分排行榜 Top 10</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {ranking.slice(0, 10).map((item, index) => (
              <Link key={item.id} to={'/members/' + item.user_id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-primary hover:shadow-sm transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0 ? 'bg-yellow-400 text-white' :
                  index === 1 ? 'bg-gray-400 text-white' :
                  index === 2 ? 'bg-amber-600 text-white' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.user?.name || '未知用户'}</p>
                  <p className="text-xs text-gray-500">{item.balance} 积分</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {levelDist.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">等级分布</h2>
          <div className="flex flex-wrap gap-4">
            {levelDist.map((level) => (
              <div key={level.id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: level.color }} />
                <span className="text-sm text-gray-700">{level.name}：{level.count} 人</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow border border-gray-100 p-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">会员名称 / 邮箱</span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="输入名称或邮箱筛选"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[160px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">会员等级</span>
          <select
            value={levelId}
            onChange={(e) => setLevelId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[120px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
          >
            <option value="">全部等级</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm">查询</button>
          <button type="button" onClick={handleReset} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm">重置</button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        {accounts.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">暂无积分账户</p>
            <p className="text-sm mt-1">会员产生消费后将自动创建积分账户</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] divide-y divide-gray-200">
                <thead className="bg-primary-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">排名</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">会员</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">等级</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">当前积分</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">累计获取</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {accounts.map((account, index) => (
                    <tr key={account.id} className="hover:bg-orange-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{((currentPage - 1) * PER_PAGE) + index + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {account.user?.name || '未知用户'}
                        <p className="text-xs text-gray-400">{account.user?.email || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        {account.level ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: account.level.color + '20', color: account.level.color }}>
                            {account.level.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-primary">{account.balance}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{account.total_earned}</td>
                      <td className="px-4 py-3">
                        <Link to={'/members/' + account.user_id} className="text-primary hover:underline">查看详情</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm text-gray-500">共 {total} 个账户{(appliedKeyword || appliedLevelId) ? '（当前筛选）' : ''}</span>
              <Pagination currentPage={currentPage} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
