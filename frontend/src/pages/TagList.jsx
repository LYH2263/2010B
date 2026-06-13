import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getTags, deleteTag } from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const PER_PAGE = 15

export default function TagList() {
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [res, setRes] = useState(null)
  const [err, setErr] = useState(null)
  const [page, setPage] = useState(1)

  const load = (p = page) => getTags({ per_page: PER_PAGE, page: p }).then(setRes).catch((e) => { setErr(e.message); showToast(e.message) })

  useEffect(() => { load(page) }, [page])

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: '删除标签',
      message: `确定删除标签「${name}」？将同时解除该标签与所有关联商品的绑定，不会删除商品本身。`,
      confirmText: '确认删除',
      tone: 'danger',
    })
    if (!ok) return
    deleteTag(id).then(() => { showToast('标签已删除', 'success'); load(page) }).catch((e) => showToast(e.message))
  }

  if (err) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load(page) }} className="text-primary hover:underline">重试</button></div>
  if (!res) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const list = res.data ?? res
  const total = res.total ?? list.length
  const currentPage = res.current_page ?? 1
  const lastPage = res.last_page ?? 1

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">标签管理</h1>
          <p className="text-gray-500 text-sm mt-0.5">管理商品标签，用于灵活打标与按标签筛选商品</p>
        </div>
        <Link to="/tags/create" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium shrink-0">新增标签</Link>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        {list.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">暂无标签</p>
            <p className="text-sm mt-1">添加标签后，可在商品编辑页为商品打标</p>
            <Link to="/tags/create" className="inline-block mt-4 text-primary hover:underline">去新增标签</Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] divide-y divide-gray-200">
                <thead className="bg-primary-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">标签</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">颜色</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">关联商品数</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {list.map((t) => (
                    <tr key={t.id} className="hover:bg-orange-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{t.id}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: t.color }}
                        >
                          {t.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-5 h-5 rounded border border-gray-200 shrink-0"
                            style={{ backgroundColor: t.color }}
                          />
                          <span className="text-gray-600 font-mono text-xs">{t.color}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-primary">{t.products_count ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${t.status ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {t.status ? '启用' : '停用'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link to={'/tags/' + t.id + '/edit'} className="text-primary hover:underline">编辑</Link>
                        <button type="button" onClick={() => handleDelete(t.id, t.name)} className="text-red-600 hover:underline ml-2">删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm text-gray-500">共 {total} 个标签</span>
              <Pagination currentPage={currentPage} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
