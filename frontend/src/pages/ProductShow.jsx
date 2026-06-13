import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getProduct, getPriceChart, getPriceHistoriesByProduct } from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../contexts/ToastContext'

export default function ProductShow() {
  const { id } = useParams()
  const { showToast } = useToast()
  const [product, setProduct] = useState(null)
  const [chartData, setChartData] = useState([])
  const [histories, setHistories] = useState(null)
  const [historiesPage, setHistoriesPage] = useState(1)
  const [err, setErr] = useState(null)

  const load = () => {
    Promise.all([
      getProduct(id).then(setProduct),
      getPriceChart(id).then((d) => setChartData(d.data || [])),
      getPriceHistoriesByProduct(id, { per_page: 10, page: historiesPage }).then(setHistories),
    ]).catch((e) => { setErr(e.message); showToast(e.message) })
  }

  useEffect(() => { load() }, [id, historiesPage])

  if (err) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load() }} className="text-primary hover:underline">重试</button></div>
  if (!product) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">商品详情</h1>
          <p className="text-gray-500 text-sm mt-0.5">查看商品基本信息，可在此编辑或去库存页调整库存</p>
        </div>
        <div className="flex gap-2">
          <Link to={'/products/' + id + '/edit'} state={{ from: 'detail' }} className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium">编辑</Link>
          <Link to={'/inventory/' + id + '/adjust'} state={{ from: 'detail' }} className="bg-white border border-primary text-primary hover:bg-primary-light px-4 py-2 rounded-lg font-medium">调整库存</Link>
          <Link to="/products" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium">返回列表</Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-primary-light border-b border-orange-100">
          <h2 className="font-semibold text-gray-800">基本信息</h2>
        </div>
        <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div><dt className="text-gray-500 text-sm">名称</dt><dd className="font-medium text-gray-800 mt-0.5">{product.name}</dd></div>
          <div><dt className="text-gray-500 text-sm">SKU</dt><dd className="mt-0.5">{product.sku}</dd></div>
          <div><dt className="text-gray-500 text-sm">分类</dt><dd className="mt-0.5">{product.category?.name ?? '-'}</dd></div>
          <div><dt className="text-gray-500 text-sm">单价</dt><dd className="mt-0.5 text-primary font-bold text-lg">¥{Number(product.price).toFixed(2)}</dd></div>
          <div><dt className="text-gray-500 text-sm">库存</dt><dd className={`mt-0.5 font-medium ${product.stock <= 10 ? 'text-orange-600' : ''}`}>{product.stock} 件</dd></div>
          <div><dt className="text-gray-500 text-sm">状态</dt><dd className="mt-0.5"><span className={product.status ? 'text-green-600 font-medium' : 'text-gray-500'}>{product.status ? '上架' : '下架'}</span></dd></div>
        </dl>
        {product.description && (
          <>
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100"><h3 className="text-sm font-medium text-gray-600">描述</h3></div>
            <div className="px-6 py-4 text-gray-700 text-sm">{product.description}</div>
          </>
        )}
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-primary-light border-b border-orange-100">
          <h2 className="font-semibold text-gray-800">价格趋势</h2>
        </div>
        <div className="p-6">
          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400">暂无价格数据</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: '#666' }}
                  tickFormatter={(value) => value.split(' ')[0]}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#666' }}
                  tickFormatter={(value) => '¥' + value.toFixed(0)}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  formatter={(value) => [`¥${Number(value).toFixed(2)}`, '价格']}
                  labelFormatter={(label) => `时间：${label}`}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ fill: '#f97316', r: 4 }}
                  activeDot={{ r: 6, fill: '#ea580c' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-primary-light border-b border-orange-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">调价历史</h2>
          <Link to="/price-histories" className="text-sm text-primary hover:underline">查看全部</Link>
        </div>
        {histories && histories.data && histories.data.length === 0 ? (
          <div className="p-8 text-center text-gray-400">暂无调价记录</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">时间</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">方式</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">原价</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">新价</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">幅度</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">操作人</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">原因</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {histories?.data?.map((h) => (
                    <tr key={h.id} className="hover:bg-orange-50">
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{new Date(h.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                          {{ fixed: '固定价', percentage: '百分比', amount: '固定金额' }[h.change_type] ?? h.change_type}
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
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-[180px] truncate" title={h.reason ?? ''}>
                        {h.reason ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {histories && histories.last_page > 1 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                <Pagination
                  currentPage={histories.current_page}
                  lastPage={histories.last_page}
                  total={histories.total}
                  onPageChange={(p) => setHistoriesPage(p)}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
