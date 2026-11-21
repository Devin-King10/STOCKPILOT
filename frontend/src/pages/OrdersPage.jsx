import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Eye, PauseCircle, XCircle, Plus, UserCheck, Search,
  ChevronLeft, ChevronRight, RefreshCw, Package
} from 'lucide-react'
import { ordersAPI, usersAPI, inventoryAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import Pagination from '../components/Pagination'

// ─── constants ────────────────────────────────────────────────────────────────
const ALL_STATUSES = [
  'Order Created',
  'Picking Pending',
  'Picking In Progress',
  'Picking Completed',
  'Packing Pending',
  'Packing In Progress',
  'Packing Completed',
  'Ready for Dispatch',
  'Dispatched',
  'Delivered',
  'On Hold',
  'Cancelled',
]
const ALL_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT']
const PAGE_SIZE = 15

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function currency(amount) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

// ─── OrdersPage ───────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const navigate = useNavigate()
  const { isManager } = useAuth()

  // list state
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // filters
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')

  // pickers list (for modals)
  const [pickers, setPickers] = useState([])

  // confirm dialog
  const [confirm, setConfirm] = useState({ open: false, message: '', onConfirm: null })

  // hold / cancel reason
  const [reasonModal, setReasonModal] = useState({ open: false, type: '', orderId: null })
  const [reason, setReason] = useState('')

  // assign picker modal
  const [assignModal, setAssignModal] = useState({ open: false, orderId: null })
  const [assignPickerId, setAssignPickerId] = useState('')

  // create order modal
  const [createModal, setCreateModal] = useState(false)

  // ── fetch orders ────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { page, limit: PAGE_SIZE }
      if (statusFilter) params.status = statusFilter
      if (priorityFilter) params.priority = priorityFilter
      if (searchQuery) params.search = searchQuery
      const res = await ordersAPI.getAll(params)
      const data = res.data
      setOrders(data.orders || data.data || [])
      setTotal(data.total || data.pagination?.total || 0)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, priorityFilter, searchQuery])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // ── fetch pickers (once) ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isManager()) return
    usersAPI.getStaffByRole('picker')
      .then(r => setPickers(r.data.users || r.data || []))
      .catch(() => {})
  }, [isManager])

  // ── actions ─────────────────────────────────────────────────────────────────
  function openHold(orderId) {
    setReason('')
    setReasonModal({ open: true, type: 'hold', orderId })
  }

  function openCancel(orderId) {
    setReason('')
    setReasonModal({ open: true, type: 'cancel', orderId })
  }

  async function submitReasonAction() {
    const { type, orderId } = reasonModal
    setReasonModal(r => ({ ...r, open: false }))
    try {
      if (type === 'hold') await ordersAPI.hold(orderId, { reason })
      else await ordersAPI.cancel(orderId, { reason })
      fetchOrders()
    } catch (e) {
      alert(e.response?.data?.message || `Failed to ${type} order`)
    }
  }

  async function submitAssignPicker() {
    if (!assignPickerId) return
    setAssignModal(m => ({ ...m, open: false }))
    try {
      await ordersAPI.assignPicker(assignModal.orderId, { picker_id: assignPickerId })
      fetchOrders()
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to assign picker')
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    setSearchQuery(searchInput)
    setPage(1)
  }

  // ── render ──────────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} order{total !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchOrders}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          {isManager() && (
            <button
              onClick={() => setCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus size={16} />
              Create Order
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[220px]">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search order # or customer…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit" className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            Search
          </button>
        </form>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Priority */}
        <select
          value={priorityFilter}
          onChange={e => { setPriorityFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Priorities</option>
          {ALL_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Clear */}
        {(statusFilter || priorityFilter || searchQuery) && (
          <button
            onClick={() => { setStatusFilter(''); setPriorityFilter(''); setSearchQuery(''); setSearchInput(''); setPage(1) }}
            className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20"><LoadingSpinner /></div>
        ) : error ? (
          <div className="py-20 text-center text-red-500">{error}</div>
        ) : orders.length === 0 ? (
          <EmptyState icon={Package} message="No orders found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Order #', 'Customer', 'Status', 'Priority', 'Items', 'Total', 'Assigned Picker', 'Created At', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map(order => (
                  <tr key={order.id || order._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-700 whitespace-nowrap">
                      {order.order_number || order.orderNumber || (order.id ? `ORD-${order.id}` : '—')}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <div className="font-medium text-gray-900">{order.customer_name || order.customer?.name || order.customerName || '—'}</div>
                      <div className="text-gray-500 text-xs">{order.customer_email || order.customer?.email || order.customerEmail || ''}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <PriorityBadge priority={order.priority} />
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-700">
                      {order.items?.length ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">
                      {currency(order.total_amount ?? order.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {order.assigned_picker?.name || order.assignedPicker?.name || (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {fmt(order.created_at || order.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* View */}
                        <button
                          title="View Order"
                          onClick={() => navigate(`/orders/${order.id || order._id}`)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Eye size={16} />
                        </button>

                        {/* Assign Picker (manager) */}
                        {isManager() && !['Cancelled', 'Delivered', 'Dispatched'].includes(order.status) && (
                          <button
                            title="Assign Picker"
                            onClick={() => { setAssignPickerId(''); setAssignModal({ open: true, orderId: order.id || order._id }) }}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                          >
                            <UserCheck size={16} />
                          </button>
                        )}

                        {/* Hold */}
                        {isManager() && !['Cancelled', 'Delivered', 'On Hold'].includes(order.status) && (
                          <button
                            title="Hold Order"
                            onClick={() => openHold(order.id || order._id)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                          >
                            <PauseCircle size={16} />
                          </button>
                        )}

                        {/* Cancel */}
                        {isManager() && !['Cancelled', 'Delivered', 'Dispatched'].includes(order.status) && (
                          <button
                            title="Cancel Order"
                            onClick={() => openCancel(order.id || order._id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}

      {/* ── Hold / Cancel Reason Modal ─────────────────────────── */}
      <Modal
        isOpen={reasonModal.open}
        onClose={() => setReasonModal(r => ({ ...r, open: false }))}
        title={reasonModal.type === 'hold' ? 'Hold Order' : 'Cancel Order'}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {reasonModal.type === 'hold'
              ? 'Please provide a reason for placing this order on hold.'
              : 'Please provide a reason for cancelling this order.'}
          </p>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            placeholder="Enter reason…"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setReasonModal(r => ({ ...r, open: false }))}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={submitReasonAction}
              disabled={!reason.trim()}
              className={`px-4 py-2 text-sm text-white rounded-lg font-medium ${
                reasonModal.type === 'hold'
                  ? 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300'
                  : 'bg-red-600 hover:bg-red-700 disabled:bg-red-300'
              }`}
            >
              Confirm {reasonModal.type === 'hold' ? 'Hold' : 'Cancel'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Assign Picker Modal ────────────────────────────────── */}
      <Modal
        isOpen={assignModal.open}
        onClose={() => setAssignModal(m => ({ ...m, open: false }))}
        title="Assign Picker"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Select a picker to assign to this order.</p>
          {pickers.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No pickers available.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {pickers.map(picker => (
                <label
                  key={picker._id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    assignPickerId === picker._id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="picker"
                    value={picker._id}
                    checked={assignPickerId === picker._id}
                    onChange={() => setAssignPickerId(picker._id)}
                    className="text-blue-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-800">{picker.name}</div>
                    <div className="text-xs text-gray-500">{picker.username || picker.email}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setAssignModal(m => ({ ...m, open: false }))}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={submitAssignPicker}
              disabled={!assignPickerId}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 font-medium"
            >
              Assign
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Create Order Modal ────────────────────────────────── */}
      {createModal && (
        <CreateOrderModal
          pickers={pickers}
          onClose={() => setCreateModal(false)}
          onCreated={() => { setCreateModal(false); fetchOrders() }}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirm.open}
        message={confirm.message}
        onConfirm={() => { confirm.onConfirm?.(); setConfirm(c => ({ ...c, open: false })) }}
        onCancel={() => setConfirm(c => ({ ...c, open: false }))}
      />
    </div>
  )
}

// ─── CreateOrderModal ──────────────────────────────────────────────────────────
function CreateOrderModal({ pickers, onClose, onCreated }) {
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: '',
    shippingCity: '',
    shippingPostalCode: '',
    priority: 'NORMAL',
    assignedPickerId: '',
    notes: '',
  })
  const [items, setItems] = useState([])
  const [itemInput, setItemInput] = useState({ sku: '', quantity: 1 })
  const [productSearch, setProductSearch] = useState([])
  const [searchingProduct, setSearchingProduct] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }))
  }

  async function searchProduct() {
    if (!itemInput.sku.trim()) return
    setSearchingProduct(true)
    try {
      const res = await inventoryAPI.getProducts({ search: itemInput.sku, limit: 5 })
      setProductSearch(res.data.products || res.data.data || [])
    } catch {
      setProductSearch([])
    } finally {
      setSearchingProduct(false)
    }
  }

  function addProduct(product) {
    if (items.find(i => i.product_id === product._id)) return
    setItems(prev => [...prev, {
      product_id: product._id,
      sku: product.sku,
      name: product.name,
      quantity: itemInput.quantity,
    }])
    setItemInput({ sku: '', quantity: 1 })
    setProductSearch([])
  }

  function addManualItem() {
    if (!itemInput.sku.trim() || itemInput.quantity < 1) return
    setItems(prev => [...prev, {
      product_id: null,
      sku: itemInput.sku.trim(),
      name: itemInput.sku.trim(),
      quantity: itemInput.quantity,
    }])
    setItemInput({ sku: '', quantity: 1 })
    setProductSearch([])
  }

  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    if (!form.customerName.trim()) { setErr('Customer name is required'); return }
    if (items.length === 0) { setErr('Add at least one item'); return }

    setSubmitting(true)
    try {
      await ordersAPI.create({
        customer: {
          name: form.customerName,
          email: form.customerEmail,
          phone: form.customerPhone,
        },
        shipping_address: {
          address: form.shippingAddress,
          city: form.shippingCity,
          postal_code: form.shippingPostalCode,
        },
        priority: form.priority,
        items: items.map(i => ({ product_id: i.product_id, sku: i.sku, quantity: i.quantity })),
        assigned_picker: form.assignedPickerId || undefined,
        notes: form.notes,
      })
      onCreated()
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to create order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Create New Order" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {err && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{err}</div>}

        {/* Customer Info */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Customer Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name <span className="text-red-500">*</span></label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.customerName}
                onChange={e => set('customerName', e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.customerEmail}
                onChange={e => set('customerEmail', e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.customerPhone}
                onChange={e => set('customerPhone', e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={form.priority}
                onChange={e => set('priority', e.target.value)}
              >
                {ALL_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Shipping */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Shipping Address</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.shippingAddress}
                onChange={e => set('shippingAddress', e.target.value)}
                placeholder="123 Main Street"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.shippingCity}
                onChange={e => set('shippingCity', e.target.value)}
                placeholder="Mumbai"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Postal Code</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.shippingPostalCode}
                onChange={e => set('shippingPostalCode', e.target.value)}
                placeholder="400001"
              />
            </div>
          </div>
        </section>

        {/* Items */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Order Items</h3>
          {/* Search bar */}
          <div className="flex gap-2 mb-2">
            <input
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search product by SKU or name…"
              value={itemInput.sku}
              onChange={e => setItemInput(v => ({ ...v, sku: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchProduct() } }}
            />
            <input
              type="number"
              min={1}
              className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
              value={itemInput.quantity}
              onChange={e => setItemInput(v => ({ ...v, quantity: parseInt(e.target.value) || 1 }))}
            />
            <button
              type="button"
              onClick={searchProduct}
              className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm hover:bg-gray-200"
            >
              {searchingProduct ? '…' : 'Search'}
            </button>
            <button
              type="button"
              onClick={addManualItem}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Add
            </button>
          </div>

          {/* Product search results */}
          {productSearch.length > 0 && (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 mb-2 max-h-40 overflow-y-auto">
              {productSearch.map(p => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => addProduct(p)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-blue-50 text-left text-sm"
                >
                  <div>
                    <span className="font-medium text-gray-800">{p.name}</span>
                    <span className="text-gray-500 ml-2 text-xs">SKU: {p.sku}</span>
                  </div>
                  <span className="text-blue-600 text-xs font-medium">Add</span>
                </button>
              ))}
            </div>
          )}

          {/* Items list */}
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-2">No items added yet.</p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full text-sm divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['SKU / Name', 'Qty', ''].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-800">{item.name}</div>
                        <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                      </td>
                      <td className="px-3 py-2 text-center">{item.quantity}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Assign Picker */}
        <section>
          <label className="block text-xs font-medium text-gray-600 mb-1">Assign Picker (optional)</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={form.assignedPickerId}
            onChange={e => set('assignedPickerId', e.target.value)}
          >
            <option value="">— Unassigned —</option>
            {pickers.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </section>

        {/* Notes */}
        <section>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
            placeholder="Optional order notes…"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
          />
        </section>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 font-medium"
          >
            {submitting ? 'Creating…' : 'Create Order'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
