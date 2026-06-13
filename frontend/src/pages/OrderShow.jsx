import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getOrder, updateOrderStatus, createShipment, getShipmentByOrder } from '../api'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const orderStatusMap = { pending: '待付款', paid: '已付款', shipped: '已发货', cancelled: '已取消', completed: '已完成' }
const orderStatusClass = { pending: 'bg-amber-100 text-amber-800', paid: 'bg-green-100 text-green-800', shipped: 'bg-blue-100 text-blue-800', cancelled: 'bg-gray-100 text-gray-600', completed: 'bg-emerald-100 text-emerald-800' }
const shipmentStatusMap = { pending: '待发货', shipped: '已发货', in_transit: '运输中', delivered: '已签收' }
const shipmentStatusClass = { pending: 'bg-amber-100 text-amber-800', shipped: 'bg-blue-100 text-blue-800', in_transit: 'bg-purple-100 text-purple-800', delivered: 'bg-emerald-100 text-emerald-800' }

export default function OrderShow() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [order, setOrder] = useState(null)
  const [shipment, setShipment] = useState(null)
  const [err, setErr] = useState(null)
  const [showShipDialog, setShowShipDialog] = useState(false)
  const [shipForm, setShipForm] = useState({ logistics_company: '', tracking_no: '', shipped_at: '', receiver_name: '', receiver_phone: '', receiver_address: '', ship_from_location: '' })
  const [submitting, setSubmitting] = useState(false)

  const loadOrder = () => getOrder(id).then(setOrder).catch((e) => { setErr(e.message); showToast(e.message) })
  const loadShipment = () => getShipmentByOrder(id).then((s) => setShipment(s || null)).catch(() => setShipment(null))

  const loadAll = () => Promise.all([loadOrder(), loadShipment()])
  useEffect(() => { loadAll() }, [id])

  const handleStatus = (status) => {
    updateOrderStatus(id, status).then(() => { showToast('订单状态已更新', 'success'); loadOrder() }).catch((e) => showToast(e.message))
  }

  const handleCancel = async () => {
    const ok = await confirm({
      title: '取消订单',
      message: '确定取消？将退回库存。',
      confirmText: '确认取消',
      tone: 'danger',
    })
    if (!ok) return
    handleStatus('cancelled')
  }

  const handleCreateShipment = async (e) => {
    e.preventDefault()
    if (!shipForm.logistics_company.trim()) { showToast('请填写物流公司'); return }
    if (!shipForm.tracking_no.trim()) { showToast('请填写运单号'); return }
    setSubmitting(true)
    try {
      const data = { ...shipForm }
      Object.keys(data).forEach((k) => { if (!data[k]) delete data[k] })
      await createShipment(order.id, data)
      showToast('运单已创建，订单已标记为已发货', 'success')
      setShowShipDialog(false)
      setShipForm({ logistics_company: '', tracking_no: '', shipped_at: '', receiver_name: '', receiver_phone: '', receiver_address: '', ship_from_location: '' })
      await loadAll()
    } catch (e) {
      showToast(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (err && !order) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); loadAll() }} className="text-primary hover:underline">重试</button></div>
  if (!order) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const items = order.items ?? []
  const tracks = shipment?.tracks ?? []
  const isDelivered = shipment?.status === 'delivered'

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">订单详情</h1>
          <p className="text-gray-500 text-sm mt-0.5">查看订单信息与明细，可更新状态、登记发货、跟踪物流</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/orders" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium">返回列表</Link>
          <Link to={'/orders/' + id + '/print'} className="bg-white border border-primary text-primary hover:bg-primary-light px-4 py-2 rounded-lg font-medium flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
            打印发货单
          </Link>
          {shipment && <Link to={'/shipments/' + shipment.id} className="bg-primary-light hover:bg-orange-100 text-primary px-4 py-2 rounded-lg font-medium">运单详情</Link>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-primary-light border-b border-orange-100 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-gray-800">订单信息</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${orderStatusClass[order.status] || 'bg-gray-100'}`}>{orderStatusMap[order.status] || order.status}</span>
        </div>
        <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><dt className="text-gray-500 text-sm">订单号</dt><dd className="font-medium text-gray-800 mt-0.5">{order.order_no}</dd></div>
          <div><dt className="text-gray-500 text-sm">总金额</dt><dd className="text-primary font-bold text-lg mt-0.5">¥{Number(order.total_amount).toFixed(2)}</dd></div>
          <div><dt className="text-gray-500 text-sm">创建时间</dt><dd className="mt-0.5">{order.created_at ? new Date(order.created_at).toLocaleString() : '-'}</dd></div>
          <div>
            <dt className="text-gray-500 text-sm">关联客户</dt>
            <dd className="mt-0.5">
              {order.user ? (
                <Link to={'/members/' + order.user.id} className="text-primary hover:underline font-medium">
                  {order.user.name}
                </Link>
              ) : (
                <span className="text-gray-400">无</span>
              )}
            </dd>
          </div>
          {order.earned_points !== undefined && order.earned_points > 0 && (
            <div>
              <dt className="text-gray-500 text-sm">获得积分</dt>
              <dd className="mt-0.5 text-green-600 font-medium">+{order.earned_points}</dd>
            </div>
          )}
          {order.remark && <div className="sm:col-span-2"><dt className="text-gray-500 text-sm">备注</dt><dd className="mt-0.5 text-gray-700">{order.remark}</dd></div>}
        </dl>
      </div>

      {shipment && (
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-primary-light border-b border-orange-100 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-primary" viewBox="0 0 20 20" fill="currentColor"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" /></svg>
              物流信息
            </h2>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${shipmentStatusClass[shipment.status] || 'bg-gray-100'}`}>{shipmentStatusMap[shipment.status] || shipment.status}</span>
              <Link to={'/shipments/' + shipment.id} className="text-primary hover:underline text-sm font-medium">查看详情 →</Link>
            </div>
          </div>
          <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><dt className="text-gray-500 text-sm">运单号</dt><dd className="font-semibold text-gray-800 mt-0.5 text-base">{shipment.tracking_no}</dd></div>
            <div><dt className="text-gray-500 text-sm">物流公司</dt><dd className="font-medium text-gray-800 mt-0.5">{shipment.logistics_company}</dd></div>
            <div><dt className="text-gray-500 text-sm">发货时间</dt><dd className="mt-0.5">{shipment.shipped_at ? new Date(shipment.shipped_at).toLocaleString() : '-'}</dd></div>
            {shipment.receiver_name && <div><dt className="text-gray-500 text-sm">收件人</dt><dd className="mt-0.5">{shipment.receiver_name}</dd></div>}
            {shipment.receiver_phone && <div><dt className="text-gray-500 text-sm">联系电话</dt><dd className="mt-0.5">{shipment.receiver_phone}</dd></div>}
            {shipment.receiver_address && <div className="sm:col-span-2 lg:col-span-1"><dt className="text-gray-500 text-sm">收货地址</dt><dd className="mt-0.5">{shipment.receiver_address}</dd></div>}
          </dl>
          {tracks.length > 0 && (
            <div className="px-6 pb-6">
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">物流轨迹时间轴</h3>
                  <button type="button" onClick={() => navigate('/shipments/' + shipment.id)} className="text-xs text-primary hover:underline font-medium">管理轨迹 →</button>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/50 via-primary/30 to-gray-200" />
                  <ul className="space-y-4 max-h-80 overflow-y-auto pr-2">
                    {tracks.map((t, idx) => (
                      <li key={t.id} className="relative pl-12">
                        <div className={`absolute left-0 top-1.5 w-7 h-7 rounded-full flex items-center justify-center border-4 ${idx === 0 ? 'bg-primary border-primary/20 shadow shadow-primary/30' : 'bg-white border-gray-200'}`}>
                          {idx === 0 ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          ) : <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
                        </div>
                        <div className={`rounded-lg p-3 ${idx === 0 ? 'bg-primary-light/50 border border-primary/20' : 'bg-white border border-gray-100'}`}>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${idx === 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{t.description}</p>
                              {t.location && <p className="text-xs text-gray-500 mt-0.5">📍 {t.location}</p>}
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap shrink-0">{t.tracked_at ? new Date(t.tracked_at).toLocaleString() : '-'}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        <h2 className="px-4 py-3 bg-primary-light border-b border-orange-100 font-semibold text-gray-800">订单明细（{items.length} 项）</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">商品</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">单价</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">数量</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">小计</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t hover:bg-orange-50/50">
                  <td className="px-4 py-3 text-sm font-medium">{item.product_name}</td>
                  <td className="px-4 py-3 text-sm">¥{Number(item.price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-primary font-medium">¥{Number(item.subtotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
        <h3 className="text-sm font-medium text-gray-700 mb-3">操作</h3>
        <div className="flex flex-wrap gap-2">
          {order.status === 'pending' && <button type="button" onClick={() => handleStatus('paid')} className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium">标记已付款</button>}
          {order.status === 'paid' && !shipment && (
            <button type="button" onClick={() => setShowShipDialog(true)} className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium">
              🚚 登记发货（填写运单）
            </button>
          )}
          {order.status === 'paid' && shipment && <button type="button" onClick={() => handleStatus('shipped')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium">标记已发货</button>}
          {order.status === 'shipped' && !isDelivered && shipment && (
            <button type="button" onClick={() => navigate('/shipments/' + shipment.id)} className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium">
              📍 追加物流轨迹
            </button>
          )}
          {order.status === 'shipped' && <button type="button" onClick={() => handleStatus('completed')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium">操作已完成</button>}
          {(order.status === 'pending' || order.status === 'paid') && <button type="button" onClick={handleCancel} className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-lg font-medium">取消订单</button>}
        </div>
      </div>

      {showShipDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 bg-primary-light flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800">📦 登记发货 · 创建运单</h3>
                <p className="text-sm text-gray-500 mt-0.5">填写物流信息后，订单将自动标记为「已发货」</p>
              </div>
              <button type="button" onClick={() => setShowShipDialog(false)} className="w-8 h-8 rounded-lg bg-white/80 hover:bg-white flex items-center justify-center text-gray-600 hover:text-gray-900 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreateShipment} className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-gray-700">物流公司 <span className="text-red-500">*</span></span>
                  <input
                    type="text"
                    required
                    value={shipForm.logistics_company}
                    onChange={(e) => setShipForm({ ...shipForm, logistics_company: e.target.value })}
                    placeholder="如：顺丰速运、圆通速递"
                    list="logistics-list"
                    className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <datalist id="logistics-list">
                    <option value="顺丰速运" />
                    <option value="圆通速递" />
                    <option value="中通快递" />
                    <option value="韵达快递" />
                    <option value="申通快递" />
                    <option value="百世快递" />
                    <option value="邮政EMS" />
                    <option value="京东物流" />
                    <option value="德邦快递" />
                  </datalist>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-gray-700">运单号 <span className="text-red-500">*</span></span>
                  <input
                    type="text"
                    required
                    value={shipForm.tracking_no}
                    onChange={(e) => setShipForm({ ...shipForm, tracking_no: e.target.value })}
                    placeholder="输入运单追踪号码"
                    className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-gray-700">发货时间</span>
                  <input
                    type="datetime-local"
                    value={shipForm.shipped_at}
                    onChange={(e) => setShipForm({ ...shipForm, shipped_at: e.target.value })}
                    className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-gray-700">发货地点</span>
                  <input
                    type="text"
                    value={shipForm.ship_from_location}
                    onChange={(e) => setShipForm({ ...shipForm, ship_from_location: e.target.value })}
                    placeholder="如：上海总仓"
                    className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </label>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                  收货信息（可选）
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm text-gray-600">收件人姓名</span>
                    <input
                      type="text"
                      value={shipForm.receiver_name}
                      onChange={(e) => setShipForm({ ...shipForm, receiver_name: e.target.value })}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm text-gray-600">联系电话</span>
                    <input
                      type="tel"
                      value={shipForm.receiver_phone}
                      onChange={(e) => setShipForm({ ...shipForm, receiver_phone: e.target.value })}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-sm text-gray-600">详细地址</span>
                    <input
                      type="text"
                      value={shipForm.receiver_address}
                      onChange={(e) => setShipForm({ ...shipForm, receiver_address: e.target.value })}
                      placeholder="省/市/区 + 街道门牌号"
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                    />
                  </label>
                </div>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700 flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                <span>提交后将自动生成初始轨迹节点「快件已揽收，等待发出」，订单状态同步更新为「已发货」。后续可在运单详情中追加更多轨迹节点。</span>
              </div>
            </form>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowShipDialog(false)}
                className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-lg font-medium"
              >
                取消
              </button>
              <button
                type="submit"
                onClick={handleCreateShipment}
                disabled={submitting}
                className="bg-primary hover:bg-primary-hover disabled:bg-primary/60 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2"
              >
                {submitting && (
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                )}
                {submitting ? '提交中...' : '确认发货并创建运单'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
