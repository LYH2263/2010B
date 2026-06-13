import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getShipment, addShipmentTrack, updateShipmentStatus } from '../api'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const statusMap = { pending: '待发货', shipped: '已发货', in_transit: '运输中', delivered: '已签收' }
const statusClass = { pending: 'bg-amber-100 text-amber-800', shipped: 'bg-blue-100 text-blue-800', in_transit: 'bg-purple-100 text-purple-800', delivered: 'bg-emerald-100 text-emerald-800' }

export default function ShipmentShow() {
  const { id } = useParams()
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [shipment, setShipment] = useState(null)
  const [err, setErr] = useState(null)
  const [showAddTrack, setShowAddTrack] = useState(false)
  const [trackForm, setTrackForm] = useState({ description: '', location: '', tracked_at: '', update_status: '' })

  const load = () => getShipment(id).then(setShipment).catch((e) => { setErr(e.message); showToast(e.message) })
  useEffect(() => { load() }, [id])

  const handleAddTrack = async (e) => {
    e.preventDefault()
    try {
      const data = { ...trackForm }
      if (!data.tracked_at) delete data.tracked_at
      if (!data.update_status) delete data.update_status
      const res = await addShipmentTrack(shipment.id, data)
      showToast('轨迹节点已追加', 'success')
      setShipment(res.shipment)
      setTrackForm({ description: '', location: '', tracked_at: '', update_status: '' })
      setShowAddTrack(false)
    } catch (e) {
      showToast(e.message)
    }
  }

  const handleStatus = async (status) => {
    const ok = await confirm({
      title: '更新运单状态',
      message: `确定要将运单状态更新为「${statusMap[status] || status}」吗？${status === 'delivered' ? '签收后订单将标记为已完成。' : ''}`,
      confirmText: '确认更新',
      tone: status === 'delivered' ? 'default' : 'default',
    })
    if (!ok) return
    updateShipmentStatus(shipment.id, status).then((res) => { showToast('运单状态已更新', 'success'); setShipment(res) }).catch((e) => showToast(e.message))
  }

  if (err && !shipment) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load() }} className="text-primary hover:underline">重试</button></div>
  if (!shipment) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const tracks = shipment.tracks ?? []
  const isDelivered = shipment.status === 'delivered'

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">运单详情</h1>
          <p className="text-gray-500 text-sm mt-0.5">查看运单信息、物流轨迹，可追加节点</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/shipments" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium">运单列表</Link>
          {shipment.order && <Link to={'/orders/' + shipment.order.id} className="bg-primary-light hover:bg-orange-100 text-primary px-4 py-2 rounded-lg font-medium">关联订单</Link>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-primary-light border-b border-orange-100 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-gray-800">运单信息</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusClass[shipment.status] || 'bg-gray-100'}`}>{statusMap[shipment.status] || shipment.status}</span>
        </div>
        <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div><dt className="text-gray-500 text-sm">运单号</dt><dd className="font-medium text-gray-800 mt-0.5 text-lg">{shipment.tracking_no}</dd></div>
          <div><dt className="text-gray-500 text-sm">物流公司</dt><dd className="font-medium text-gray-800 mt-0.5">{shipment.logistics_company}</dd></div>
          <div><dt className="text-gray-500 text-sm">关联订单</dt><dd className="mt-0.5">{shipment.order ? <Link to={'/orders/' + shipment.order.id} className="text-primary hover:underline font-medium">{shipment.order.order_no}</Link> : '-'}</dd></div>
          <div><dt className="text-gray-500 text-sm">发货时间</dt><dd className="mt-0.5">{shipment.shipped_at ? new Date(shipment.shipped_at).toLocaleString() : '-'}</dd></div>
          <div><dt className="text-gray-500 text-sm">订单金额</dt><dd className="mt-0.5">{shipment.order ? `¥${Number(shipment.order.total_amount).toFixed(2)}` : '-'}</dd></div>
          <div><dt className="text-gray-500 text-sm">订单状态</dt><dd className="mt-0.5">{shipment.order ? (statusMap[shipment.order.status] || shipment.order.status) : '-'}</dd></div>
          {shipment.receiver_name && <div><dt className="text-gray-500 text-sm">收件人</dt><dd className="mt-0.5">{shipment.receiver_name}</dd></div>}
          {shipment.receiver_phone && <div><dt className="text-gray-500 text-sm">联系电话</dt><dd className="mt-0.5">{shipment.receiver_phone}</dd></div>}
          {shipment.receiver_address && <div className="sm:col-span-2 lg:col-span-1"><dt className="text-gray-500 text-sm">收货地址</dt><dd className="mt-0.5">{shipment.receiver_address}</dd></div>}
        </dl>
      </div>

      <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
        <h3 className="text-sm font-medium text-gray-700 mb-3">操作</h3>
        <div className="flex flex-wrap gap-2">
          {!isDelivered && <button type="button" onClick={() => setShowAddTrack(!showAddTrack)} className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium">追加物流轨迹</button>}
          {(shipment.status === 'shipped' || shipment.status === 'in_transit') && <button type="button" onClick={() => handleStatus('delivered')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium">标记已签收</button>}
          {shipment.status === 'pending' && <button type="button" onClick={() => handleStatus('shipped')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">标记已发货</button>}
          {shipment.status === 'shipped' && <button type="button" onClick={() => handleStatus('in_transit')} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium">标记运输中</button>}
        </div>
      </div>

      {showAddTrack && (
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-primary-light border-b border-orange-100">
            <h3 className="font-semibold text-gray-800">追加物流轨迹</h3>
          </div>
          <form onSubmit={handleAddTrack} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-sm text-gray-600 font-medium">轨迹描述 <span className="text-red-500">*</span></span>
                <input
                  type="text"
                  required
                  value={trackForm.description}
                  onChange={(e) => setTrackForm({ ...trackForm, description: e.target.value })}
                  placeholder="如：快件已到达【北京分拨中心】"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600 font-medium">所在地点</span>
                <input
                  type="text"
                  value={trackForm.location}
                  onChange={(e) => setTrackForm({ ...trackForm, location: e.target.value })}
                  placeholder="如：北京市朝阳区"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600 font-medium">轨迹时间</span>
                <input
                  type="datetime-local"
                  value={trackForm.tracked_at}
                  onChange={(e) => setTrackForm({ ...trackForm, tracked_at: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </label>
              <label className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={trackForm.update_status === 'delivered'}
                  onChange={(e) => setTrackForm({ ...trackForm, update_status: e.target.checked ? 'delivered' : '' })}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">此节点为签收节点（同时更新运单为「已签收」，联动订单为「已完成」）</span>
              </label>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg font-medium">确认追加</button>
              <button type="button" onClick={() => { setShowAddTrack(false); setTrackForm({ description: '', location: '', tracked_at: '', update_status: '' }) }} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2 rounded-lg font-medium">取消</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-primary-light border-b border-orange-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">物流轨迹 <span className="text-gray-500 text-sm font-normal ml-1">（共 {tracks.length} 条）</span></h2>
          {tracks.length > 0 && <span className="text-xs text-gray-500">按时间倒序展示</span>}
        </div>
        {tracks.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">暂无物流轨迹</p>
            <p className="text-sm mt-1">{isDelivered ? '运单已完成' : '点击「追加物流轨迹」添加节点'}</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="relative">
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/50 via-primary/30 to-gray-200" />
              <ul className="space-y-5">
                {tracks.map((t, idx) => (
                  <li key={t.id} className="relative pl-12">
                    <div className={`absolute left-0 top-1.5 w-8 h-8 rounded-full flex items-center justify-center border-4 ${idx === 0 ? 'bg-primary border-primary/20 shadow-lg shadow-primary/30' : 'bg-white border-gray-200'}`}>
                      {idx === 0 ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                      )}
                    </div>
                    <div className={`rounded-lg p-4 ${idx === 0 ? 'bg-primary-light/60 border border-primary/20' : 'bg-gray-50 border border-gray-100'}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${idx === 0 ? 'text-gray-900' : 'text-gray-700'}`}>{t.description}</p>
                          {t.location && <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                            {t.location}
                          </p>}
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap shrink-0">{t.tracked_at ? new Date(t.tracked_at).toLocaleString() : '-'}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
