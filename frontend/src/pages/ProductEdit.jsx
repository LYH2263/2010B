import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import { getProduct, updateProduct, getCategoriesAll, getTagsAll, findOrCreateTag } from '../api'
import { useToast } from '../contexts/ToastContext'

const DEFAULT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899',
]

export default function ProductEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const fromDetail = location.state?.from === 'detail'
  const backTo = () => (fromDetail ? navigate('/products/' + id) : navigate('/products'))
  const [categories, setCategories] = useState([])
  const [allTags, setAllTags] = useState([])
  const [product, setProduct] = useState(null)
  const [err, setErr] = useState(null)
  const [form, setForm] = useState(null)
  const [selectedTagIds, setSelectedTagIds] = useState([])
  const [priceReason, setPriceReason] = useState('')
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [creating, setCreating] = useState(false)
  const tagDropdownRef = useRef(null)

  const load = () => Promise.all([getProduct(id), getCategoriesAll(), getTagsAll()])
    .then(([p, cats, tags]) => {
      setProduct(p)
      setCategories(cats)
      setAllTags(tags)
      setForm({ name: p.name, sku: p.sku, category_id: p.category_id || '', price: p.price, stock: p.stock, status: p.status })
      setSelectedTagIds((p.tags || []).map((t) => t.id))
    })
    .catch((e) => { setErr(e.message); showToast(e.message) })

  useEffect(() => { load() }, [id])

  useEffect(() => {
    const handleClick = (e) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target)) {
        setTagDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const getTagById = (tagId) => allTags.find((t) => String(t.id) === String(tagId))

  const toggleTag = (tagId) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((xid) => xid !== tagId) : [...prev, tagId]
    )
  }

  const removeTag = (tagId) => {
    setSelectedTagIds((prev) => prev.filter((xid) => xid !== tagId))
  }

  const handleCreateTag = async () => {
    const name = newTagName.trim()
    if (!name) { showToast('请输入标签名称'); return }
    if (name.length > 64) { showToast('标签名称不能超过64个字符'); return }
    const randomColor = DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]
    try {
      setCreating(true)
      const tag = await findOrCreateTag(name, randomColor)
      if (!allTags.find((t) => t.id === tag.id)) {
        setAllTags((prev) => [...prev, tag])
      }
      if (!selectedTagIds.includes(tag.id)) {
        setSelectedTagIds((prev) => [...prev, tag.id])
      }
      setNewTagName('')
      showToast(`已添加标签「${tag.name}」`, 'success')
    } catch (e) {
      showToast(e.message)
    } finally {
      setCreating(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      name: form.name,
      sku: form.sku,
      category_id: form.category_id || null,
      price: form.price,
      stock: form.stock,
      status: Number(form.status),
      tag_ids: selectedTagIds,
    }
    if (parseFloat(form.price) !== parseFloat(product.price) && priceReason.trim()) {
      payload.price_reason = priceReason.trim()
    }
    updateProduct(id, payload)
      .then(() => { showToast('商品已保存', 'success'); backTo() })
      .catch((e) => showToast(e.message))
  }

  if (err && !product) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load() }} className="text-primary hover:underline">重试</button></div>
  if (!form) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const filteredTags = tagSearch.trim()
    ? allTags.filter((t) => t.name.toLowerCase().includes(tagSearch.trim().toLowerCase()) && t.status === 1)
    : allTags.filter((t) => t.status === 1)

  return (
    <div className="space-y-4">
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <Link to="/products" className="hover:text-primary">商品列表</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-800">编辑</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800">编辑商品</h1>
        <p className="text-gray-600 text-base mt-1">修改商品信息后保存，库存可在库存管理中单独调整</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 sm:p-8 max-w-2xl">
        <div className="space-y-5">
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">分类</label>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none">
              <option value="">-- 请选择 --</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">商品名称 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="请输入商品名称" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">SKU <span className="text-red-500">*</span></label>
            <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required placeholder="请输入 SKU 编号" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div className="relative" ref={tagDropdownRef}>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">标签（可多选）</label>
            <div
              onClick={() => setTagDropdownOpen((o) => !o)}
              className="border-2 border-gray-300 rounded-lg px-3 py-2.5 min-h-[44px] cursor-pointer bg-white flex flex-wrap items-center gap-1 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
            >
              {selectedTagIds.length === 0 ? (
                <span className="text-gray-400">点击选择标签，或在下拉中快速创建新标签</span>
              ) : (
                selectedTagIds.map((tid) => {
                  const t = getTagById(tid)
                  if (!t) return null
                  return (
                    <span
                      key={tid}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs text-white"
                      style={{ backgroundColor: t.color }}
                    >
                      {t.name}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeTag(tid) }}
                        className="ml-1 hover:bg-white/30 rounded-full w-4 h-4 flex items-center justify-center"
                      >
                        ×
                      </button>
                    </span>
                  )
                })
              )}
              <span className="ml-auto text-gray-400 text-sm">▾</span>
            </div>
            {tagDropdownOpen && (
              <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden flex flex-col">
                <div className="p-2 border-b border-gray-100 flex gap-2">
                  <input
                    type="text"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder="搜索已有标签..."
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div className="p-2 border-b border-gray-100 flex gap-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateTag() } }}
                    placeholder="输入新标签名称快速创建..."
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleCreateTag() }}
                    disabled={creating || !newTagName.trim()}
                    className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {creating ? '创建中...' : '+ 创建'}
                  </button>
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
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
            <p className="text-gray-500 text-sm mt-1.5">可选择多个标签，也可输入名称即时创建新标签</p>
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">单价 <span className="text-red-500">*</span></label>
            <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required placeholder="0.00" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
            {parseFloat(form.price) !== parseFloat(product.price) && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">调价原因 <span className="text-gray-400">（可选）</span></label>
                <textarea
                  value={priceReason}
                  onChange={(e) => setPriceReason(e.target.value)}
                  placeholder="请输入调价原因，便于后续追溯"
                  rows={2}
                  className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none"
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">库存</label>
            <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">状态</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none">
              <option value={1}>上架</option>
              <option value={0}>下架</option>
            </select>
          </div>
        </div>
        <div className="mt-8 flex gap-3 pt-2">
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg font-medium text-base">保存</button>
          <button type="button" onClick={backTo} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2.5 rounded-lg font-medium text-base">取消</button>
        </div>
      </form>
    </div>
  )
}
