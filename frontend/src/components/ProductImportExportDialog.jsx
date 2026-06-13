import { useState, useRef } from 'react'
import { getProductImportTemplateUrl, validateProductImport, confirmProductImport } from '../api'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

export default function ProductImportExportDialog({ onClose, onSuccess }) {
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [stage, setStage] = useState('upload')
  const [file, setFile] = useState(null)
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [strategy, setStrategy] = useState('skip_errors')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setValidationResult(null)
    setImportResult(null)
    setStage('upload')
  }

  const handleValidate = async () => {
    if (!file) {
      showToast('请先选择 CSV 文件', 'error')
      return
    }
    setValidating(true)
    try {
      const result = await validateProductImport(file)
      setValidationResult(result)
      setStage('preview')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setValidating(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!validationResult || !validationResult.rows) return

    const validRows = validationResult.rows.filter((r) => r.valid)
    const errorRows = validationResult.rows.filter((r) => !r.valid)

    if (strategy === 'rollback_all' && errorRows.length > 0) {
      showToast('存在错误行，全部回滚策略不允许继续导入', 'error')
      return
    }

    const rowsToImport = strategy === 'skip_errors' ? validRows : validationResult.rows

    if (rowsToImport.length === 0) {
      showToast('没有可导入的有效数据', 'error')
      return
    }

    const ok = await confirm({
      title: '确认导入',
      message: `即将导入 ${rowsToImport.length} 条商品数据${strategy === 'skip_errors' && errorRows.length > 0 ? `（跳过 ${errorRows.length} 条错误行）` : ''}，策略：${strategy === 'skip_errors' ? '跳过错误行' : '全部回滚'}`,
      confirmText: '确认导入',
      tone: 'default',
    })
    if (!ok) return

    setImporting(true)
    try {
      const result = await confirmProductImport(rowsToImport, strategy)
      setImportResult(result)
      setStage('result')

      if (result.rolled_back) {
        showToast('导入已回滚：所有行均未写入', 'error')
      } else if (result.fail_count === 0) {
        showToast(`导入成功：${result.success_count} 条`, 'success')
      } else if (result.success_count > 0) {
        showToast(`导入完成：成功 ${result.success_count} 条，失败 ${result.fail_count} 条`, 'warning')
      } else {
        showToast(`导入全部失败：${result.fail_count} 条`, 'error')
      }

      if (result.success_count > 0) {
        onSuccess?.(result)
      }
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setValidationResult(null)
    setImportResult(null)
    setStage('upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">商品批量导入</h2>
            <p className="text-sm text-gray-500 mt-0.5">上传 CSV 文件批量录入商品</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            disabled={importing}
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {stage === 'upload' && (
            <>
              <div className="flex gap-3">
                <a
                  href={getProductImportTemplateUrl()}
                  download
                  className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  下载模板
                </a>
              </div>

              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer bg-gray-50 ${file ? 'border-primary/50' : 'border-gray-300 hover:border-primary/50'}`}
                onClick={() => fileInputRef?.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                {file ? (
                  <div>
                    <p className="text-primary font-medium">{file.name}</p>
                    <p className="text-sm text-gray-400 mt-1">点击更换文件</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600 mb-1">点击上传 CSV 文件</p>
                    <p className="text-sm text-gray-400">支持 .csv 或 .txt 文件</p>
                  </div>
                )}
              </div>
            </>
          )}

          {stage === 'preview' && validationResult && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">校验预览</h3>
                <button type="button" onClick={handleReset} className="text-sm text-gray-500 hover:text-primary">
                  重新上传
                </button>
              </div>

              {validationResult.errors && validationResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  {validationResult.errors.map((err, idx) => (
                    <p key={idx} className="text-sm text-red-600">{err}</p>
                  ))}
                </div>
              )}

              {validationResult.rows && validationResult.rows.length > 0 && (
                <>
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-600">总计：<strong>{validationResult.rows.length}</strong> 行</span>
                    <span className="text-emerald-700">通过：<strong>{validationResult.rows.filter((r) => r.valid).length}</strong></span>
                    <span className="text-red-600">错误：<strong>{validationResult.rows.filter((r) => !r.valid).length}</strong></span>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="max-h-[320px] overflow-y-auto">
                      <table className="w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 w-16">行号</th>
                            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">名称</th>
                            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">SKU</th>
                            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">分类</th>
                            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">价格</th>
                            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">库存</th>
                            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">状态</th>
                            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 w-24">校验</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {validationResult.rows.map((row, idx) => (
                            <tr key={idx} className={row.valid ? 'hover:bg-orange-50' : 'bg-red-50'}>
                              <td className="px-3 py-2 text-sm text-gray-500">{row.row_num}</td>
                              <td className="px-3 py-2 text-sm">{row.data.name || '-'}</td>
                              <td className="px-3 py-2 text-sm font-mono">{row.data.sku || '-'}</td>
                              <td className="px-3 py-2 text-sm">{row.data.category_name || '-'}</td>
                              <td className="px-3 py-2 text-sm">{row.data.price ?? '-'}</td>
                              <td className="px-3 py-2 text-sm">{row.data.stock ?? '-'}</td>
                              <td className="px-3 py-2 text-sm">{row.data.status_text || '-'}</td>
                              <td className="px-3 py-2">
                                {row.valid ? (
                                  <span className="inline-flex items-center text-emerald-700 text-xs font-medium">
                                    <svg className="w-4 h-4 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    通过
                                  </span>
                                ) : (
                                  <span className="text-red-600 text-xs" title={row.errors.join('; ')}>
                                    {row.errors[0]}
                                    {row.errors.length > 1 && ` +${row.errors.length - 1}`}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {validationResult.rows.some((r) => !r.valid) && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-h-40 overflow-y-auto">
                      <h4 className="text-sm font-semibold text-red-800 mb-2">错误详情</h4>
                      {validationResult.rows.filter((r) => !r.valid).map((row, idx) => (
                        <p key={idx} className="text-sm text-red-700">
                          第 {row.row_num} 行：{row.errors.join('；')}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">导入策略</h4>
                    <div className="flex gap-6">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={strategy === 'skip_errors'}
                          onChange={() => setStrategy('skip_errors')}
                          className="mt-0.5 text-primary"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-800">跳过错误行</span>
                          <p className="text-xs text-gray-500 mt-0.5">仅导入校验通过的行，错误行跳过</p>
                        </div>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={strategy === 'rollback_all'}
                          onChange={() => setStrategy('rollback_all')}
                          className="mt-0.5 text-primary"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-800">全部回滚</span>
                          <p className="text-xs text-gray-500 mt-0.5">任一行失败则全部回滚，不写入任何数据</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {validationResult.rows && validationResult.rows.length === 0 && validationResult.errors && validationResult.errors.length > 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>文件校验失败，请检查文件格式后重新上传</p>
                  <button type="button" onClick={handleReset} className="mt-3 text-primary hover:underline text-sm">
                    重新上传
                  </button>
                </div>
              )}
            </>
          )}

          {stage === 'result' && importResult && (
            <div className={`border rounded-xl p-5 ${importResult.fail_count > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <h3 className="font-semibold text-gray-800 mb-3">导入结果</h3>
              <div className="flex gap-6 text-sm mb-3">
                <span className="text-emerald-700">成功：{importResult.success_count} 条</span>
                <span className="text-red-600">失败：{importResult.fail_count} 条</span>
                <span className="text-gray-600">总计：{importResult.total} 条</span>
                {importResult.rolled_back && (
                  <span className="text-amber-700 font-medium">已全部回滚</span>
                )}
              </div>
              {importResult.failed && importResult.failed.length > 0 && (
                <div className="max-h-40 overflow-y-auto bg-white rounded-lg border border-gray-200 mt-3">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">行号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">失败原因</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {importResult.failed.map((f, idx) => (
                        <tr key={idx} className="bg-red-50">
                          <td className="px-3 py-2 text-gray-800">{f.row_num || '-'}</td>
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
            onClick={stage === 'result' ? onClose : handleReset}
            disabled={importing}
            className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-5 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
          >
            {stage === 'result' ? '关闭' : stage === 'preview' ? '返回上传' : '取消'}
          </button>
          {stage === 'upload' && (
            <button
              type="button"
              onClick={handleValidate}
              disabled={!file || validating}
              className="bg-primary hover:bg-primary-hover disabled:bg-gray-300 text-white px-5 py-2 rounded-lg font-medium text-sm disabled:cursor-not-allowed"
            >
              {validating ? '校验中...' : '上传并校验'}
            </button>
          )}
          {stage === 'preview' && validationResult?.rows?.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={importing || (strategy === 'rollback_all' && validationResult.rows.some((r) => !r.valid))}
              className="bg-primary hover:bg-primary-hover disabled:bg-gray-300 text-white px-5 py-2 rounded-lg font-medium text-sm disabled:cursor-not-allowed"
            >
              {importing ? '导入中...' : `确认导入（${strategy === 'skip_errors' ? validationResult.rows.filter((r) => r.valid).length : validationResult.rows.length} 条）`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
