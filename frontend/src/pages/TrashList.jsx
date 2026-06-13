import { useState, useEffect } from 'react'
import { getTrashProducts, getTrashCategories, restoreProduct, restoreCategory, forceDeleteProduct, forceDeleteCategory } from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const PER_PAGE = 15

export default function TrashList() {
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [activeTab, setActiveTab] = useState('products')
  const [productsRes, setProductsRes] = useState(null)
  const [categoriesRes, setCategoriesRes] = useState(null)
  const [productErr, setProductErr] = useState(null)
  const [categoryErr, setCategoryErr] = useState(null)
  const [productPage, setProductPage] = useState(1)
  const [categoryPage, setCategoryPage] = useState(1)
  const [productKeyword, setProductKeyword] = useState('')
  const [categoryKeyword, setCategoryKeyword] = useState('')
  const [appliedProductKeyword, setAppliedProductKeyword] = useState('')
  const [appliedCategoryKeyword, setAppliedCategoryKeyword] = useState('')

  const loadProducts = (p = productPage) => {
    const params = { per_page: PER_PAGE, page: p }
    if (appliedProductKeyword) params.keyword = appliedProductKeyword
    return getTrashProducts(params).then(setProductsRes).catch((e) => { setProductErr(e.message); showToast(e.message) })
  }

  const loadCategories = (p = categoryPage) => {
    const params = { per_page: PER_PAGE, page: p }
    if (appliedCategoryKeyword) params.keyword = appliedCategoryKeyword
    return getTrashCategories(params).then(setCategoriesRes).catch((e) => { setCategoryErr(e.message); showToast(e.message) })
  }

  useEffect(() => {
    if (activeTab === 'products') {
      loadProducts(productPage)
    }
  }, [activeTab, productPage, appliedProductKeyword])

  useEffect(() => {
    if (activeTab === 'categories') {
      loadCategories(categoryPage)
    }
  }, [activeTab, categoryPage, appliedCategoryKeyword])

  const handleProductSearch = (e) => {
    e?.preventDefault()
    setAppliedProductKeyword(productKeyword.trim())
    setProductPage(1)
  }

  const handleCategorySearch = (e) => {
    e?.preventDefault()
    setAppliedCategoryKeyword(categoryKeyword.trim())
    setCategoryPage(1)
  }

  const handleRestoreProduct = async (product) => {
    const ok = await confirm({
      title: '恢复商品',
      message: `确定恢复「${product.name}」？恢复后将回到商品列表。`,
      confirmText: '确认恢复',
      tone: 'primary',
    })
    if (!ok) return
    try {
      await restoreProduct(product.id)
      showToast('商品已恢复', 'success')
      loadProducts(productPage)
    } catch (e) {
      showToast(e.message)
    }
  }

  const handleRestoreCategory = async (category) => {
    const ok = await confirm({
      title: '恢复分类',
      message: `确定恢复「${category.name}」？恢复后将回到分类列表。`,
      confirmText: '确认恢复',
      tone: 'primary',
    })
    if (!ok) return
    try {
      await restoreCategory(category.id)
      showToast('分类已恢复', 'success')
      loadCategories(categoryPage)
    } catch (e) {
      showToast(e.message)
    }
  }

  const handleForceDeleteProduct = async (product) => {
    const ok = await confirm({
      title: '彻底删除商品',
      message: `确定彻底删除「${product.name}」？此操作不可逆，删除后无法恢复！`,
      confirmText: '确认彻底删除',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await forceDeleteProduct(product.id)
      showToast('商品已彻底删除', 'success')
      loadProducts(productPage)
    } catch (e) {
      showToast(e.message)
    }
  }

  const handleForceDeleteCategory = async (category) => {
    const ok = await confirm({
      title: '彻底删除分类',
      message: `确定彻底删除「${category.name}」？此操作不可逆，删除后无法恢复！\n注意：分类下必须没有商品才能彻底删除。`,
      confirmText: '确认彻底删除',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await forceDeleteCategory(category.id)
      showToast('分类已彻底删除', 'success')
      loadCategories(categoryPage)
    } catch (e) {
      showToast(e.message)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const productList = productsRes?.data ?? productsRes ?? []
  const productTotal = productsRes?.total ?? productList.length
  const productCurrentPage = productsRes?.current_page ?? 1
  const productLastPage = productsRes?.last_page ?? 1

  const categoryList = categoriesRes?.data ?? categoriesRes ?? []
  const categoryTotal = categoriesRes?.total ?? categoryList.length
  const categoryCurrentPage = categoriesRes?.current_page ?? 1
  const categoryLastPage = categoriesRes?.last_page ?? 1

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">回收站</h1>
          <p className="text-gray-500 text-sm mt-0.5">管理已删除的商品和分类，支持恢复或彻底删除</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'products'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              商品回收站
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'categories'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              分类回收站
            </button>
          </nav>
        </div>

        <div className="p-4">
          {activeTab === 'products' && (
            <div className="space-y-4">
              <form onSubmit={handleProductSearch} className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-gray-600">商品名称 / SKU</span>
                  <input
                    type="text"
                    value={productKeyword}
                    onChange={(e) => setProductKeyword(e.target.value)}
                    placeholder="搜索商品名称或 SKU"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[200px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </label>
                <div className="flex items-center gap-2">
                  <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm">查询</button>
                  <button
                    type="button"
                    onClick={() => { setProductKeyword(''); setAppliedProductKeyword(''); setProductPage(1) }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm"
                  >
                    重置
                  </button>
                </div>
              </form>

              {productErr ? (
                <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setProductErr(null); loadProducts(productPage) }} className="text-primary hover:underline">重试</button></div>
              ) : !productsRes ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>
              ) : productList.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <p className="text-lg">回收站暂无商品</p>
                  <p className="text-sm mt-1">删除的商品会出现在这里</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">名称</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">SKU</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">分类</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">单价</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">删除时间</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {productList.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-500">{p.id}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-800">{p.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{p.sku}</td>
                            <td className="px-4 py-3 text-sm">
                              {p.category ? (
                                <span className={p.category_deleted ? 'text-red-500' : 'text-gray-600'}>
                                  {p.category.name}
                                  {p.category_deleted && '（已删除）'}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">¥{Number(p.price).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatDate(p.deleted_at)}</td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleRestoreProduct(p)}
                                className="text-primary hover:underline"
                              >
                                恢复
                              </button>
                              <button
                                type="button"
                                onClick={() => handleForceDeleteProduct(p)}
                                className="text-red-600 hover:underline ml-3"
                              >
                                彻底删除
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-sm text-gray-500">共 {productTotal} 个已删除商品</span>
                    <Pagination currentPage={productCurrentPage} lastPage={productLastPage} total={productTotal} onPageChange={(p) => setProductPage(p)} />
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-4">
              <form onSubmit={handleCategorySearch} className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-gray-600">分类名称</span>
                  <input
                    type="text"
                    value={categoryKeyword}
                    onChange={(e) => setCategoryKeyword(e.target.value)}
                    placeholder="搜索分类名称"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[200px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </label>
                <div className="flex items-center gap-2">
                  <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm">查询</button>
                  <button
                    type="button"
                    onClick={() => { setCategoryKeyword(''); setAppliedCategoryKeyword(''); setCategoryPage(1) }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm"
                  >
                    重置
                  </button>
                </div>
              </form>

              {categoryErr ? (
                <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setCategoryErr(null); loadCategories(categoryPage) }} className="text-primary hover:underline">重试</button></div>
              ) : !categoriesRes ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>
              ) : categoryList.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <p className="text-lg">回收站暂无分类</p>
                  <p className="text-sm mt-1">删除的分类会出现在这里</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">名称</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">标识</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">商品数（含回收站）</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">删除时间</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {categoryList.map((c) => (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-500">{c.id}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-800">{c.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{c.slug ?? '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{c.products_count ?? 0}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatDate(c.deleted_at)}</td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleRestoreCategory(c)}
                                className="text-primary hover:underline"
                              >
                                恢复
                              </button>
                              <button
                                type="button"
                                onClick={() => handleForceDeleteCategory(c)}
                                className="text-red-600 hover:underline ml-3"
                              >
                                彻底删除
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-sm text-gray-500">共 {categoryTotal} 个已删除分类</span>
                    <Pagination currentPage={categoryCurrentPage} lastPage={categoryLastPage} total={categoryTotal} onPageChange={(p) => setCategoryPage(p)} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
