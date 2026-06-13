import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getProducts, getCategoriesAll, deleteProduct, getTagsAll } from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const PER_PAGE = 15

export default function ProductList() {
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [res, setRes] = useState(null)
  const [err, setErr] = useState(null)
  const [categories, setCategories] = useState([])
  const [allTags, setAllTags] = useState([])
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState([])
  const [tagMode, setTagMode] = useState('any')
  const [page, setPage] = useState(1)
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [appliedCategoryId, setAppliedCategoryId] = useState('')
  const [appliedTagIds, setAppliedTagIds] = useState([])
  const [appliedTagMode, setAppliedTagMode] = useState('any')
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const tagDropdownRef = useRef(null)

  const load = (p = page) => {
    const params = { per_page: PER_PAGE, page: p }
    if (appliedCategoryId) params.category_id = appliedCategoryId
    if (appliedKeyword) params.keyword = appliedKeyword
    if (appliedTagIds.length > 0) params.tag_ids = appliedTagIds.join(',')
    if (appliedTagIds.length > 0) params.tag_mode = appliedTagMode
    return getProducts(params).then(setRes).catch((e) => { setErr(e.message); showToast(e.message) })
  }

  useEffect(() => {
    getCategoriesAll().then(setCategories).catch(() => setCategories([]))
    getTagsAll().then(setAllTags).catch(() => setAllTags([]))
  }, [])
  useEffect(() => { load(page) }, [page, appliedCategoryId, appliedKeyword, appliedTagIds, appliedTagMode])

  useEffect(() => {
    const handleClick = (e) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target)) {
        setTagDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSearch = (e) => {
    e?.preventDefault()
    setAppliedKeyword(keyword.trim())
    setAppliedCategoryId(categoryId)
    setAppliedTagIds([...selectedTagIds])
    setAppliedTagMode(tagMode)
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setCategoryId('')
    setSelectedTagIds([])
    setTagMode('any')
    setAppliedKeyword('')
    setAppliedCategoryId('')
    setAppliedTagIds([])
    setAppliedTagMode('any')
    setPage(1)
  }

  const toggleTag = (tagId) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const removeAppliedTag = (tagId) => {
    setAppliedTagIds((prev) => prev.filter((id) => id !== tagId))
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId))
  }

  const getTagById = (id) => allTags.find((t) => String(t.id) === String(id))

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: '删除商品',
      message: `确定删除「${name}」？删除后不可恢复。`,
      confirmText: '确认删除',
      tone: 'danger',
    })
    if (!ok) return
    deleteProduct(id).then(() => { showToast('商品已删除', 'success'); load(page) }).catch((e) => showToast(e.message))
  }

  if (err) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load(page) }} className="text-primary hover:underline">重试</button></div>
  if (!res) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const list = res.data ?? res
  const total = res.total ?? list.length
  const currentPage = res.current_page ?? 1
  const lastPage = res.last_page ?? 1

  const filteredTags = tagSearch.trim()
    ? allTags.filter((t) => t.name.toLowerCase().includes(tagSearch.trim().toLowerCase()))
    : allTags

  const hasActiveFilters = appliedKeyword || appliedCategoryId || appliedTagIds.length > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">商品列表</h1>
          <p className="text-gray-500 text-sm mt-0.5">管理全部商品，支持按分类、标签筛选与搜索名称/SKU</p>
        </div>
        <Link to="/products/create" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium shrink-0">新增商品</Link>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow border border-gray-100 p-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">商品名称 / SKU</span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索商品名称或 SKU"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[160px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">分类</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[120px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
          >
            <option value="">全部分类</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1 relative" ref={tagDropdownRef}>
          <span className="text-sm text-gray-600">标签（可多选）</span>
          <div
            onClick={() => setTagDropdownOpen((o) => !o)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[280px] cursor-pointer bg-white flex items-center justify-between hover:border-primary/50"
          >
            <div className="flex flex-wrap gap-1 flex-1 min-h-[22px]">
              {selectedTagIds.length === 0 ? (
                <span className="text-gray-400">请选择标签...</span>
              ) : (
                selectedTagIds.map((tid) => {
                  const t = getTagById(tid)
                  if (!t) return null
                  return (
                    <span
                      key={tid}
                      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs text-white"
                      style={{ backgroundColor: t.color }}
                    >
                      {t.name}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleTag(tid) }}
                        className="ml-1 hover:bg-white/30 rounded-full w-3.5 h-3.5 flex items-center justify-center"
                      >
                        ×
                      </button>
                    </span>
                  )
                })
              )}
            </div>
            <span className="text-gray-400 ml-2">▾</span>
          </div>
          {tagDropdownOpen && (
            <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  placeholder="搜索标签..."
                  onClick={(e) => e.stopPropagation()}
                  className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div className="overflow-y-auto flex-1">
                {filteredTags.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-400">暂无匹配标签</div>
                ) : (
                  filteredTags.map((t) => {
                    const checked = selectedTagIds.includes(t.id)
                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleTag(t.id)}
                        className={`px-3 py-2 cursor-pointer flex items-center gap-2 text-sm hover:bg-orange-50 ${checked ? 'bg-orange-50' : ''}`}
                      >
                        <input type="checkbox" checked={checked} readOnly className="rounded text-primary" />
                        <span
                          className="inline-block w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: t.color }}
                        />
                        <span className="text-gray-700 flex-1">{t.name}</span>
                        {t.status === 0 && <span className="text-xs text-gray-400">（已停用）</span>}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">匹配方式</span>
          <select
            value={tagMode}
            onChange={(e) => setTagMode(e.target.value)}
            disabled={selectedTagIds.length < 2}
            className={`border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[130px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white ${selectedTagIds.length < 2 ? 'text-gray-400' : ''}`}
          >
            <option value="any">满足任一</option>
            <option value="all">同时满足</option>
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm">查询</button>
          <button type="button" onClick={handleReset} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm">重置</button>
        </div>
      </form>

      {hasActiveFilters && (
        <div className="bg-white rounded-xl shadow border border-gray-100 p-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-500 shrink-0">当前筛选：</span>
          {appliedKeyword && (
            <span className="inline-flex items-center bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full gap-1">
              关键词: {appliedKeyword}
              <button type="button" onClick={() => { setKeyword(''); setAppliedKeyword('') }} className="hover:text-red-500">×</button>
            </span>
          )}
          {appliedCategoryId && (() => {
            const c = categories.find((x) => String(x.id) === String(appliedCategoryId))
            return c ? (
              <span className="inline-flex items-center bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full gap-1">
                分类: {c.name}
                <button type="button" onClick={() => { setCategoryId(''); setAppliedCategoryId('') }} className="hover:text-red-500">×</button>
              </span>
            ) : null
          })()}
          {appliedTagIds.map((tid) => {
            const t = getTagById(tid)
            if (!t) return null
            return (
              <span
                key={tid}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs text-white gap-1"
                style={{ backgroundColor: t.color }}
              >
                {t.name}
                <button type="button" onClick={() => removeAppliedTag(tid)} className="hover:bg-white/30 rounded-full w-3.5 h-3.5 flex items-center justify-center">×</button>
              </span>
            )
          })}
          {appliedTagIds.length >= 2 && (
            <span className="inline-flex items-center bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
              匹配: {appliedTagMode === 'all' ? '同时满足' : '满足任一'}
            </span>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="ml-auto text-gray-500 hover:text-red-500 text-xs"
          >
            清空全部
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        {list.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">暂无商品</p>
            <p className="text-sm mt-1">添加分类后即可创建商品</p>
            <Link to="/products/create" className="inline-block mt-4 text-primary hover:underline">去新增商品</Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] divide-y divide-gray-200">
                <thead className="bg-primary-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">名称</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">标签</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">SKU</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">分类</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">单价</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">库存</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {list.map((p) => (
                    <tr key={p.id} className="hover:bg-orange-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{p.id}</td>
                      <td className="px-4 py-3 text-sm font-medium">{p.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[240px]">
                          {p.tags && p.tags.length > 0 ? p.tags.map((t) => (
                            <span
                              key={t.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: t.color }}
                              title={t.name}
                            >
                              {t.name}
                            </span>
                          )) : <span className="text-xs text-gray-400">-</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{p.sku}</td>
                      <td className="px-4 py-3 text-sm">{p.category?.name ?? '-'}</td>
                      <td className="px-4 py-3 text-sm text-primary font-medium">¥{Number(p.price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">{p.stock}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${p.status ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{p.status ? '上架' : '下架'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <Link to={'/products/' + p.id} className="text-primary hover:underline">详情</Link>
                        <Link to={'/products/' + p.id + '/edit'} state={{ from: 'list' }} className="text-primary hover:underline ml-2">编辑</Link>
                        <button type="button" onClick={() => handleDelete(p.id, p.name)} className="text-red-600 hover:underline ml-2">删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm text-gray-500">共 {total} 件商品{hasActiveFilters ? '（当前筛选）' : ''}</span>
              <Pagination currentPage={currentPage} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
