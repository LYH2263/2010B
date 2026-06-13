import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getOrderPrintData, getOrderExportHtmlUrl } from '../api'
import { useToast } from '../contexts/ToastContext'

export default function OrderPrint() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [paperSize, setPaperSize] = useState('a4')

  useEffect(() => {
    getOrderPrintData(id)
      .then(setData)
      .catch((e) => { setErr(e.message); showToast(e.message) })
  }, [id])

  const handlePrint = () => {
    window.print()
  }

  const handleExport = () => {
    const url = getOrderExportHtmlUrl(id)
    const link = document.createElement('a')
    link.href = url
    link.download = ''
    link.click()
  }

  if (err && !data) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); window.location.reload() }} className="text-primary hover:underline">重试</button></div>
  if (!data) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const items = data.items ?? []
  const shipment = data.shipment
  const printTime = new Date().toLocaleString()
  const orderTime = data.created_at ? new Date(data.created_at).toLocaleString() : '-'

  return (
    <div className="print-page-wrapper">
      <div className="print-toolbar no-print">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/orders/' + id)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm">
              ← 返回订单
            </button>
            <h1 className="text-lg font-bold text-gray-800">打印发货单</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setPaperSize('a4')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${paperSize === 'a4' ? 'bg-white shadow text-primary' : 'text-gray-600 hover:text-gray-800'}`}
              >
                A4 纸
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('receipt')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${paperSize === 'receipt' ? 'bg-white shadow text-primary' : 'text-gray-600 hover:text-gray-800'}`}
              >
                小票纸
              </button>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm"
            >
              下载 HTML
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg font-medium text-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
              打印
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-center py-6 no-print">
        <div className={`print-preview-container ${paperSize === 'receipt' ? 'receipt-mode' : 'a4-mode'}`}>
          <PrintSheet data={data} items={items} shipment={shipment} printTime={printTime} orderTime={orderTime} paperSize={paperSize} isPreview />
        </div>
      </div>

      <div className="print-area">
        <PrintSheet data={data} items={items} shipment={shipment} printTime={printTime} orderTime={orderTime} paperSize={paperSize} />
      </div>
    </div>
  )
}

function PrintSheet({ data, items, shipment, printTime, orderTime, paperSize, isPreview }) {
  const isReceipt = paperSize === 'receipt'
  return (
    <div className={`print-sheet ${isPreview ? 'bg-white' : ''} ${isReceipt ? 'receipt-sheet' : 'a4-sheet'}`}>
      <StoreHeader data={data} paperSize={paperSize} />

      <div className={`info-grid ${isReceipt ? 'receipt-info' : ''}`}>
        <InfoItem label="订单号" value={data.order_no} mono />
        <InfoItem label="订单状态" value={data.status_label} />
        <InfoItem label="下单时间" value={orderTime} />
        <InfoItem label="客户" value={data.user?.name || '—'} />
        {shipment && (
          <>
            <InfoItem label="物流公司" value={shipment.logistics_company || '—'} />
            <InfoItem label="运单号" value={shipment.tracking_no || '—'} mono />
            {shipment.shipped_at && <InfoItem label="发货时间" value={new Date(shipment.shipped_at).toLocaleString()} />}
          </>
        )}
      </div>

      {shipment && (shipment.receiver_name || shipment.receiver_phone || shipment.receiver_address) && (
        <div className="receiver-block">
          <h3 className="receiver-title">收货信息</h3>
          <div className={`receiver-grid ${isReceipt ? 'receipt-receiver-grid' : ''}`}>
            {shipment.receiver_name && <InfoItem label="收件人" value={shipment.receiver_name} />}
            {shipment.receiver_phone && <InfoItem label="联系电话" value={shipment.receiver_phone} />}
            {shipment.receiver_address && <InfoItem label="收货地址" value={shipment.receiver_address} fullWidth />}
          </div>
        </div>
      )}

      {data.remark && (
        <div className="remark-block">
          <span className="font-medium text-amber-800">备注：</span>
          <span className="text-gray-700">{data.remark}</span>
        </div>
      )}

      <table className={`items-table ${isReceipt ? 'receipt-table' : ''}`}>
        <thead>
          <tr>
            <th className="text-left">商品名称</th>
            <th className="text-center">SKU</th>
            <th className="text-right">单价</th>
            <th className="text-center">数量</th>
            <th className="text-right">小计</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="text-left font-medium">{item.product_name}</td>
              <td className="text-center font-mono text-xs text-gray-500">{item.product_sku || '—'}</td>
              <td className="text-right">¥{Number(item.price).toFixed(2)}</td>
              <td className="text-center">{item.quantity}</td>
              <td className="text-right font-semibold text-primary">¥{Number(item.subtotal).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="total-row">
            <td colSpan={4} className="text-right font-bold">合计</td>
            <td className="text-right font-bold text-primary text-lg">¥{Number(data.total_amount).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="print-footer">
        <span>打印时间：{printTime}</span>
        <span>此发货单由系统自动生成</span>
      </div>
    </div>
  )
}

function StoreHeader({ data, paperSize }) {
  return (
    <div className={`print-header ${paperSize === 'receipt' ? 'receipt-header' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg>
        </div>
        <div>
          <div className={`font-bold text-primary ${paperSize === 'receipt' ? 'text-base' : 'text-xl'}`}>{data.store_name}</div>
          <div className="text-gray-400 text-xs">发货单 / Packing Slip</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-gray-400 text-xs">订单编号</div>
        <div className={`font-bold font-mono ${paperSize === 'receipt' ? 'text-sm' : 'text-lg'}`}>{data.order_no}</div>
      </div>
    </div>
  )
}

function InfoItem({ label, value, mono, fullWidth }) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}
