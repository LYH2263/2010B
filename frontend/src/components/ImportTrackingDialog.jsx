import { useState, useRef } from 'react'
import { importTracking } from '../api'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const LOGISTICS_COMPANIES = ['顺丰速运', '中通快递', '圆通速递', '申通快递', '韵达快递', '极兔速递', '邮政EMS', '京东物流', '德邦快递', '其他']

export default function ImportTrackingDialog({ onClose, onSuccess }) {
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [logisticsCompany, setLogisticsCompany] = useState(LOGISTICS_COMPANIES[0])
  const [customCompany, setCustomCompany] = useState('')
  const [importMode, setImportMode] = useState('paste')
  const [pasteText, setPasteText] = useState('')
  const [parsedMappings, setParsedMappings] = useState([])
  const [parseError, setParseError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)

  const selectedCompany = logisticsCompany === '其他' ? customCompany.trim() : logisticsCompany

  const parseText = (text) => {
    const lines = text.trim().split(/\r?\n/).filter((l) => l.trim())
    const mappings = []
    const errors = []

    lines.forEach((line, idx) => {
      const trimmed = line.trim()
      let parts = []
      if (trimmed.includes('\t')) {
        parts = trimmed.split('\t').map((p) => p.trim())
      } else if (trimmed.includes(',')) {
        parts = trimmed.split(',').map((p) => p.trim())
      } else if (trimmed.includes(' ')) {
        parts = trimmed.split(/\s+/).map((p) => p.trim())
      } else {
        parts = [trimmed, '']
      }

      const orderNo = parts[0] || ''
      const trackingNo = parts[1] || ''

      if (orderNo && trackingNo) {
        mappings.push({ order_no: orderNo, tracking_no: trackingNo })
      } else {
        errors.push(`第 ${idx + 1} 行：格式不正确`)
      }
    })

    return { mappings, errors }
  }

  const handlePasteChange = (e) => {
    const text = e.target.value
    setPasteText(text)
    setResult(null)

    if (!text.trim()) {
      setParsedMappings([])
      setParseError('')
      return
    }

    const { mappings, errors } = parseText(text)
    setParsedMappings(mappings)
    if (errors.length > 0 && mappings.length === 0) {
      setParseError('无法解析有效数据，请检查格式。支持格式：订单号,运单号 或 订单号 运单号 或 订单号\\t运单号')
    } else if (errors.length > 0) {
      setParseError(`成功解析 ${mappings.length} 条，${errors.length} 条格式有误`)
    } else {
      setParseError('')
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result || ''
      setPasteText(text.toString())
      const { mappings, errors } = parseText(text.toString())
      setParsedMappings(mappings)
      if (errors.length > 0 && mappings.length === 0) {
        setParseError('无法解析有效数据，请检查文件格式')
      } else if (errors.length > 0) {
        setParseError(`成功解析 ${mappings.length} 条，${errors.length} 条格式有误`)
      } else {
        setParseError('')
      }
    }
    reader.readAsText(file)
  }

  const handleSubmit = async () => {
    if (!selectedCompany) {
      showToast('请选择或填写物流公司', 'error')
      return
    }
    if (parsedMappings.length === 0) {
      showToast('请先输入或上传有效的运单号数据', 'error')
      return
    }

    const ok = await confirm({
      title: '确认导入发货',
      message: `确定要对 ${parsedMappings.length} 个订单执行导入发货吗？物流公司：${selectedCompany}`,
      confirmText: '确认导入',
      tone: 'default',
    })
    if (!ok) return

    setSubmitting(true)
    try {
      const resultData = await importTracking(selectedCompany, parsedMappings)
      setResult(resultData)
      if (resultData.success_count > 0 && resultData.failed_count === 0) {
        showToast(`导入发货成功：${resultData.success_count} 单`, 'success')
      } else if (resultData.success_count > 0 && resultData.failed_count > 0) {
        showToast(`导入发货完成：成功 ${resultData.success_count} 单，失败 ${resultData.failed_count} 单`, 'warning')
      } else {
        showToast(`导入发货全部失败：${resultData.failed_count} 单`, 'error')
      }
      if (resultData.success_count > 0) {
        onSuccess?.(resultData)
      }
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">导入运单号发货</h2>
            <p className="text-sm text-gray-500 mt-0.5">按订单号-运单号映射批量匹配发货</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            disabled={submitting}
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">物流公司</span>
              <select
                value={logisticsCompany}
                onChange={(e) => setLogisticsCompany(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                disabled={submitting || result}
              >
                {LOGISTICS_COMPANIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            {logisticsCompany === '其他' && (
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">自定义公司名称</span>
                <input
                  type="text"
                  value={customCompany}
                  onChange={(e) => setCustomCompany(e.target.value)}
                  placeholder="请输入物流公司名称"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  disabled={submitting || result}
                />
              </label>
            )}
          </div>

          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
            <div className="flex items-center gap-4 mb-3">
              <span className="text-sm font-medium text-gray-700">导入方式：</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={importMode === 'paste'}
                  onChange={() => setImportMode('paste')}
                  disabled={submitting || result}
                  className="text-primary"
                />
                <span className="text-sm text-gray-700">粘贴文本</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={importMode === 'file'}
                  onChange={() => setImportMode('file')}
                  disabled={submitting || result}
                  className="text-primary"
                />
                <span className="text-sm text-gray-700">上传文件</span>
              </label>
            </div>
          </div>

          {importMode === 'paste' ? (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                粘贴订单号与运单号（每行一条，支持逗号/空格/Tab分隔）
              </label>
              <textarea
                value={pasteText}
                onChange={handlePasteChange}
                placeholder="ORD2024010100001,SF1234567890&#10;ORD2024010100002	SF1234567891&#10;ORD2024010100003 SF1234567892"
                rows={6}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                disabled={submitting || result}
              />
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-gray-50"
              onClick={() => fileInputRef?.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv"
                onChange={handleFileChange}
                className="hidden"
                disabled={submitting || result}
              />
              <p className="text-gray-600 mb-1">点击上传文件</p>
              <p className="text-sm text-gray-400">支持 .txt 或 .csv 文件，每行一条记录</p>
              {pasteText && (
                <p className="text-sm text-primary mt-2">已选择文件，共 {parsedMappings.length} 条记录</p>
              )}
            </div>
          )}

          {parseError && (
            <p className="text-sm text-amber-600">{parseError}</p>
          )}

          {parsedMappings.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-primary-light border-b border-orange-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">预览 ({parsedMappings.length} 条)</h3>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 w-16">序号</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">订单号</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">运单号</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedMappings.slice(0, 50).map((m, idx) => (
                      <tr key={idx} className="hover:bg-orange-50">
                        <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-2 text-sm">{m.order_no}</td>
                        <td className="px-4 py-2 text-sm font-mono">{m.tracking_no}</td>
                      </tr>
                    ))}
                    {parsedMappings.length > 50 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-center text-sm text-gray-400">
                          仅显示前 50 条，共 {parsedMappings.length} 条
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result && (
            <div className={`border rounded-xl p-4 ${result.failed_count > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <h3 className="font-semibold text-gray-800 mb-2">导入发货结果</h3>
              <div className="flex gap-4 text-sm mb-3">
                <span className="text-emerald-700">成功：{result.success_count} 单</span>
                <span className="text-red-600">失败：{result.failed_count} 单</span>
                <span className="text-gray-600">总计：{result.total} 单</span>
              </div>
              {result.failed.length > 0 && (
                <div className="max-h-40 overflow-y-auto bg-white rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">订单号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">运单号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">失败原因</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {result.failed.map((f, idx) => (
                        <tr key={idx} className="bg-red-50">
                          <td className="px-3 py-2 text-gray-800">{f.order_no || f.order_id}</td>
                          <td className="px-3 py-2 text-gray-600">{f.tracking_no || '-'}</td>
                          <td className="px-3 py-2 text-red-600">{f.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-5 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
          >
            {result ? '关闭' : '取消'}
          </button>
          {!result && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || parsedMappings.length === 0 || !selectedCompany}
              className="bg-primary hover:bg-primary-hover disabled:bg-gray-300 text-white px-5 py-2 rounded-lg font-medium text-sm disabled:cursor-not-allowed"
            >
              {submitting ? '导入中...' : `确认导入 (${parsedMappings.length} 单)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
