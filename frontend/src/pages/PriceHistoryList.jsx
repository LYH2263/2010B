import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getPriceHistories } from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../contexts/ToastContext'

const PER_PAGE = 20

export default function PriceHistoryList() {
  const { showToast } = useToast()
  const [res, setRes] = useState(null)
  const [err, setErr] = useState(null)
  const [page, setPage] = useState(1)

  const load = (p = page) => {
    return getPriceHistories({ per_page: PER_PAGE, page: p })
      .then(setRes)
      .catch((e) => { setErr(e.message); showToast(e.message) })
  }

  useEffect(() => { load(page) }, [page])

  if (err) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load(page) }} className="text-primary hover:underline">重试</button></div>
  if (!res) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const list = res.data ?? res
  const total = res.total ?? list.length
  const currentPage = res.current_page ?? 1
  const lastPage = res.last_page ?? 1

  const typeLabel = {
    fixed: '固定价',
    percentage: '百分比',
    amount: '固定金额',
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">调价历史</h1>
          <p className="text-gray-500 text-sm mt-0.5">查看所有商品的价格调整记录</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        {list.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">暂无调价记录</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] divide-y divide-gray-200">
                <thead className="bg-primary-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">时间</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">商品</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">调价方式</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">原价</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">新价</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">幅度</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作人</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">原因</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {list.map((h) => (
                    <tr key={h.id} className="hover:bg-orange-50">
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{new Date(h.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">
                        <Link to={'/products/' + h.product_id} className="text-primary hover:underline font-medium">
                          {h.product?.name ?? '-'}
                        </Link>
                        {h.product?.sku && <span className="text-gray-400 text-xs ml-2">({h.product.sku})</span>}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                          {typeLabel[h.change_type] ?? h.change_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">¥{Number(h.old_price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-primary">¥{Number(h.new_price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                        <span className={h.change_amount > 0 ? 'text-red-600' : h.change_amount < 0 ? 'text-green-600' : 'text-gray-400'}>
                          {h.change_amount > 0 ? '+' : ''}{Number(h.change_amount).toFixed(2)}
                          {h.change_percent !== null && (
                            <span className="text-xs ml-1">({h.change_percent > 0 ? '+' : ''}{Number(h.change_percent).toFixed(2)}%)</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{h.user?.name ?? '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate" title={h.reason ?? ''}>
                        {h.reason ?? '-'}
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
    </div>
  )
}
