import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Truck, Package, Search, RefreshCw, Loader2, CheckCircle2,
  AlertCircle, Printer, ChevronRight, MapPin, User, Calendar,
  Hash, DollarSign, FileText, X
} from 'lucide-react'
import { dispatchAPI } from '../services/api'

// ── Toast ─────────────────────────────────────────────────────────────────────

const useToast = () => {
  const [toasts, setToasts] = useState([])
  const show = (message, type = 'info') => {
    const id = Date.now()
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500)
  }
  return { toasts, success: m => show(m, 'success'), error: m => show(m, 'error'), info: m => show(m, 'info') }
}

const ToastContainer = ({ toasts }) => (
  <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
    {toasts.map(t => (
      <div key={t.id} className={`pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-white text-sm flex items-center gap-2 max-w-sm
        ${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}>
        {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
        {t.message}
      </div>
    ))}
  </div>
)

// ── Modal ─────────────────────────────────────────────────────────────────────

const Modal = ({ open, onClose, title, wide, children }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className={`relative bg-white rounded-xl shadow-2xl z-10 p-6 ${wide ? 'w-full max-w-2xl' : 'w-full max-w-md'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Shared micro-components ───────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const map = {
    READY_FOR_DISPATCH: 'bg-emerald-100 text-emerald-700',
    DISPATCHED:         'bg-green-100  text-green-700',
    DELIVERED:          'bg-teal-100   text-teal-700',
    ON_HOLD:            'bg-amber-100  text-amber-700',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  )
}

const SHIPMENT_TYPES = ['Standard', 'Express', 'Same Day', 'International', 'Bulky']

// ── Print Summary ─────────────────────────────────────────────────────────────

const PrintSummaryModal = ({ open, onClose, summary }) => {
  const printRef = useRef(null)
  const handlePrint = () => {
    const content = printRef.current?.innerHTML ?? ''
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <html><head><title>Dispatch Summary</title>
      <style>
        body { font-family: sans-serif; padding: 32px; color: #111; }
        h1 { font-size: 22px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 13px; }
        th { background: #f3f4f6; font-weight: 600; }
        .label { font-weight: 600; color: #374151; }
        .section { margin-top: 20px; }
      </style></head><body>${content}</body></html>`)
    w.document.close()
    w.print()
  }

  return (
    <Modal open={open} onClose={onClose} title="Dispatch Summary" wide>
      {summary ? (
        <>
          <div ref={printRef} className="text-sm text-gray-800 space-y-3">
            <h1 className="text-xl font-bold">Dispatch Summary — {summary.order_number ?? summary.order?.order_number}</h1>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div><span className="font-semibold text-gray-600">Customer:</span> {summary.customer_name ?? summary.order?.customer_name}</div>
              <div><span className="font-semibold text-gray-600">Courier:</span> {summary.courier_name ?? '—'}</div>
              <div><span className="font-semibold text-gray-600">Tracking #:</span> {summary.tracking_number ?? '—'}</div>
              <div><span className="font-semibold text-gray-600">Shipment Type:</span> {summary.shipment_type ?? '—'}</div>
              <div><span className="font-semibold text-gray-600">Shipping Cost:</span> {summary.shipping_cost != null ? `₹${Number(summary.shipping_cost).toFixed(2)}` : '—'}</div>
              <div><span className="font-semibold text-gray-600">Dispatch Date:</span> {summary.dispatched_at ? new Date(summary.dispatched_at).toLocaleString('en-IN') : '—'}</div>
            </div>
            {summary.shipping_address && (
              <div><span className="font-semibold text-gray-600">Address:</span> {summary.shipping_address}</div>
            )}
            {Array.isArray(summary.items) && summary.items.length > 0 && (
              <table>
                <thead><tr><th>Product</th><th>SKU</th><th>Qty</th></tr></thead>
                <tbody>
                  {summary.items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.product_name}</td>
                      <td className="font-mono">{item.sku}</td>
                      <td>{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {summary.notes && <div><span className="font-semibold text-gray-600">Notes:</span> {summary.notes}</div>}
          </div>
          <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">Close</button>
            <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2">
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const DISPATCH_FORM_DEFAULT = {
  courier_name:   '',
  tracking_number: '',
  shipment_type:  'Standard',
  shipping_cost:  '',
  notes:          '',
}

export default function DispatchPage() {
  const toast = useToast()

  const [activeTab, setActiveTab]   = useState('ready')   // 'ready' | 'history'
  const [search, setSearch]         = useState('')

  // Data
  const [readyOrders, setReadyOrders]     = useState([])
  const [historyOrders, setHistoryOrders] = useState([])
  const [loading, setLoading]             = useState(true)

  // Dispatch modal
  const [dispatchModal, setDispatchModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [dispatchForm, setDispatchForm]   = useState(DISPATCH_FORM_DEFAULT)
  const [submitting, setSubmitting]       = useState(false)

  // Print summary modal
  const [printModal, setPrintModal]       = useState(false)
  const [printSummary, setPrintSummary]   = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  // Mark delivered
  const [delivering, setDelivering]       = useState(null)

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [readyRes, historyRes] = await Promise.all([
        dispatchAPI.getQueue({ status: 'READY_FOR_DISPATCH', search: search || undefined }),
        dispatchAPI.getQueue({ status: 'DISPATCHED,DELIVERED', search: search || undefined }),
      ])
      const extractList = r => r.data.orders ?? r.data.items ?? r.data ?? []
      setReadyOrders(extractList(readyRes))
      setHistoryOrders(extractList(historyRes))
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Failed to load dispatch data.')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Dispatch ──────────────────────────────────────────────────────────────

  const openDispatchModal = (order) => {
    setSelectedOrder(order)
    setDispatchForm(DISPATCH_FORM_DEFAULT)
    setDispatchModal(true)
  }

  const handleConfirmDispatch = async () => {
    if (!dispatchForm.courier_name.trim()) { toast.error('Courier name is required.'); return }
    if (!dispatchForm.tracking_number.trim()) { toast.error('Tracking number is required.'); return }
    setSubmitting(true)
    try {
      await dispatchAPI.confirmDispatch({
        order_id:        selectedOrder.id,
        courier_name:    dispatchForm.courier_name,
        tracking_number: dispatchForm.tracking_number,
        shipment_type:   dispatchForm.shipment_type,
        shipping_cost:   dispatchForm.shipping_cost ? Number(dispatchForm.shipping_cost) : undefined,
        notes:           dispatchForm.notes || undefined,
      })
      toast.success(`Order ${selectedOrder.order_number ?? selectedOrder.id} dispatched!`)
      setDispatchModal(false)
      fetchData()
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Dispatch failed.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Print Summary ─────────────────────────────────────────────────────────

  const handlePrintSummary = async (orderId) => {
    setPrintSummary(null)
    setPrintModal(true)
    setLoadingSummary(true)
    try {
      const res = await dispatchAPI.getSummary(orderId)
      setPrintSummary(res.data.summary ?? res.data)
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Failed to load summary.')
      setPrintModal(false)
    } finally {
      setLoadingSummary(false)
    }
  }

  // ── Mark Delivered ────────────────────────────────────────────────────────

  const handleMarkDelivered = async (order) => {
    if (!window.confirm(`Mark order ${order.order_number ?? order.id} as DELIVERED?`)) return
    setDelivering(order.id)
    try {
      await dispatchAPI.markDelivered(order.id)
      toast.success('Order marked as delivered.')
      fetchData()
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Failed to mark delivered.')
    } finally {
      setDelivering(null)
    }
  }

  // ── Filtered ──────────────────────────────────────────────────────────────

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <ToastContainer toasts={toast.toasts} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-emerald-600" />
            Dispatch Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage shipment dispatch and delivery tracking</p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        {/* Tabs */}
        <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
          <button
            onClick={() => setActiveTab('ready')}
            className={`px-5 py-2.5 text-sm font-medium transition flex items-center gap-2 ${
              activeTab === 'ready'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Package className="w-4 h-4" />
            Ready for Dispatch
            {!loading && readyOrders.length > 0 && (
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'ready' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                {readyOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2.5 text-sm font-medium transition flex items-center gap-2 border-l border-gray-200 ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Truck className="w-4 h-4" />
            Dispatch History
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* ── Tab: Ready for Dispatch ─────────────────────────────────────────── */}
      {activeTab === 'ready' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            </div>
          ) : readyOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Truck className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg">No orders ready for dispatch</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {readyOrders.map(order => (
                <div key={order.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition p-5 flex flex-col gap-4">
                  {/* Card header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono font-bold text-gray-900 text-lg">
                        {order.order_number ?? `#${order.id}`}
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5 flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {order.customer_name ?? '—'}
                      </p>
                    </div>
                    <StatusBadge status={order.status ?? 'READY_FOR_DISPATCH'} />
                  </div>

                  {/* Shipping address */}
                  {order.shipping_address && (
                    <div className="text-xs text-gray-500 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
                      <span>{order.shipping_address}</span>
                    </div>
                  )}

                  {/* Items count */}
                  {(order.items_count != null || order.items?.length) && (
                    <div className="text-xs text-gray-600 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-gray-400" />
                      {order.items_count ?? order.items?.length} item(s)
                    </div>
                  )}

                  {/* Package details */}
                  {(order.package_dimensions || order.package_weight) && (
                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                      {order.package_dimensions && <div>📦 {order.package_dimensions}</div>}
                      {order.package_weight    && <div>⚖️ {order.package_weight} kg</div>}
                      {order.package_type      && <div>🏷️ {order.package_type}</div>}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1 border-t border-gray-100 mt-auto">
                    <button
                      onClick={() => openDispatchModal(order)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition"
                    >
                      <Truck className="w-4 h-4" /> Dispatch
                    </button>
                    <button
                      onClick={() => handlePrintSummary(order.id)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                      title="Print Summary"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Tab: Dispatch History ───────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            </div>
          ) : historyOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <FileText className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg">No dispatch history found</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Order #', 'Customer', 'Courier', 'Tracking #', 'Dispatch Date', 'Executive', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {historyOrders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold text-gray-900 text-sm">
                            {order.order_number ?? `#${order.id}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800">
                          {order.customer_name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {order.courier_name ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                            {order.tracking_number ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {fmtDateTime(order.dispatched_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {order.dispatch_executive ?? order.dispatched_by ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handlePrintSummary(order.id)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500 hover:text-blue-600"
                              title="Print Summary"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {order.status === 'DISPATCHED' && (
                              <button
                                onClick={() => handleMarkDelivered(order)}
                                disabled={delivering === order.id}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-xs font-medium hover:bg-teal-100 disabled:opacity-50 transition"
                              >
                                {delivering === order.id
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <CheckCircle2 className="w-3 h-3" />}
                                Mark Delivered
                              </button>
                            )}
                            {order.status === 'DELIVERED' && (
                              <span className="inline-flex items-center gap-1 text-teal-600 text-xs font-medium">
                                <CheckCircle2 className="w-3 h-3" /> Delivered
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Dispatch Modal ──────────────────────────────────────────────────── */}
      <Modal open={dispatchModal} onClose={() => setDispatchModal(false)} title={`Dispatch Order — ${selectedOrder?.order_number ?? ''}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                <Truck className="w-3 h-3" /> Courier Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Blue Dart"
                value={dispatchForm.courier_name}
                onChange={e => setDispatchForm(p => ({ ...p, courier_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                <Hash className="w-3 h-3" /> Tracking Number *
              </label>
              <input
                type="text"
                placeholder="e.g. BD1234567890"
                value={dispatchForm.tracking_number}
                onChange={e => setDispatchForm(p => ({ ...p, tracking_number: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Shipment Type</label>
              <select
                value={dispatchForm.shipment_type}
                onChange={e => setDispatchForm(p => ({ ...p, shipment_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {SHIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Shipping Cost (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={dispatchForm.shipping_cost}
                onChange={e => setDispatchForm(p => ({ ...p, shipping_cost: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Notes
            </label>
            <textarea
              rows={3}
              placeholder="Special instructions or notes…"
              value={dispatchForm.notes}
              onChange={e => setDispatchForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
            <button
              onClick={() => setDispatchModal(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDispatch}
              disabled={submitting}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm Dispatch
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Print Summary Modal ─────────────────────────────────────────────── */}
      <PrintSummaryModal
        open={printModal}
        onClose={() => { setPrintModal(false); setPrintSummary(null) }}
        summary={loadingSummary ? null : printSummary}
      />
    </div>
  )
}
