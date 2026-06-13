import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createTag } from '../api'
import { useToast } from '../contexts/ToastContext'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#64748b', '#475569', '#1f2937',
]

export default function TagCreate() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [form, setForm] = useState({ name: '', color: '#6366f1', status: 1 })

  const handleSubmit = (e) => {
    e.preventDefault()
    createTag({
      name: form.name.trim(),
      color: form.color,
      status: Number(form.status),
    })
      .then(() => { showToast('标签已创建', 'success'); navigate('/tags') })
      .catch((e) => showToast(e.message))
  }

  return (
    <div className="space-y-4">
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <Link to="/tags" className="hover:text-primary">标签列表</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-800">新增标签</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800">新增标签</h1>
        <p className="text-gray-600 text-base mt-1">标签用于给商品灵活打标，如「新品」「热卖」「清仓」等</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 sm:p-8 max-w-xl">
        <div className="space-y-5">
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">标签名称 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              maxLength={64}
              placeholder="如：新品、热卖、清仓"
              className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">标签颜色 <span className="text-red-500">*</span></label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer bg-white p-1"
              />
              <input
                type="text"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                pattern="#[0-9A-Fa-f]{6}"
                required
                placeholder="#6366f1"
                className="flex-1 rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base font-mono text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>
            <div className="mt-3">
              <p className="text-sm text-gray-500 mb-2">快速选择：</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    title={c}
                    className={`w-7 h-7 rounded-md border-2 transition-transform hover:scale-110 ${form.color.toLowerCase() === c.toLowerCase() ? 'border-gray-800 ring-2 ring-gray-400' : 'border-gray-200'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">预览：</p>
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: form.color }}
              >
                {form.name || '标签预览'}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">状态</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value={1}>启用</option>
              <option value={0}>停用</option>
            </select>
            <p className="text-gray-500 text-sm mt-1.5">停用的标签不会出现在商品编辑的可选列表中</p>
          </div>
        </div>
        <div className="mt-8 flex gap-3 pt-2">
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg font-medium text-base">保存</button>
          <button type="button" onClick={() => navigate('/tags')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2.5 rounded-lg font-medium text-base">取消</button>
        </div>
      </form>
    </div>
  )
}
