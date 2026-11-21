import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Package, Plus, Search, Edit2, Trash2, TrendingUp, TrendingDown,
  RefreshCw, Barcode, AlertTriangle, X, ChevronDown, ArrowUpDown,
  Eye, Layers, Filter, ScanLine, History, CheckCircle, XCircle
} from 'lucide-react'
import { inventoryAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

// ─── Inline fallback components (safe if real ones aren't loaded yet) ────────

function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])
  if (!isOpen) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Delete', danger = true }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${danger ? 'bg-red-100' : 'bg-blue-100'}`}>
            <AlertTriangle className={`w-5 h-5 ${danger ? 'text-red-600' : 'text-blue-600'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
          <button onClick={() => { onConfirm(); onClose() }} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    active:      { label: 'Active',       cls: 'bg-green-100 text-green-700' },
    inactive:    { label: 'Inactive',     cls: 'bg-gray-100 text-gray-600' },
    discontinued:{ label: 'Discontinued', cls: 'bg-red-100 text-red-700' },
    low_stock:   { label: 'Low Stock',    cls: 'bg-yellow-100 text-yellow-700' },
  }
  const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TRANSACTION_TYPES = [
  { value: 'IN',     label: 'Stock In',    color: 'text-green-600' },
  { value: 'OUT',    label: 'Stock Out',   color: 'text-blue-600' },
  { value: 'ADJUST', label: 'Adjust',      color: 'text-purple-600' },
  { value: 'DAMAGE', label: 'Damage',      color: 'text-red-600' },
]

const STATUSES = ['active', 'inactive', 'discontinued']

const ZONE_COLORS = {
  A: 'bg-blue-50 border-blue-200',
  B: 'bg-green-50 border-green-200',
  C: 'bg-purple-50 border-purple-200',
  D: 'bg-orange-50 border-orange-200',
}

function inputCls(err) {
  return `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${err ? 'border-red-400' : 'border-gray-300'}`
}

function FormField({ label, error, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ─── Add/Edit Product Modal ───────────────────────────────────────────────────

const EMPTY_PRODUCT = {
  name: '', sku: '', barcode: '', category: '', description: '',
  available_qty: 0, min_stock_level: 0, unit_price: 0,
  bin_location: '', status: 'active',
}

function ProductModal({ isOpen, onClose, product, binLocations, onSaved }) {
  const [form, setForm] = useState(EMPTY_PRODUCT)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setForm(product ? {
        name: product.name || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        category: product.category || '',
        description: product.description || '',
        available_qty: product.available_qty ?? 0,
        min_stock_level: product.min_stock_level ?? 0,
        unit_price: product.unit_price ?? 0,
        bin_location: product.bin_location || '',
        status: product.status || 'active',
      } : EMPTY_PRODUCT)
      setErrors({})
      setApiError('')
    }
  }, [isOpen, product])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.sku.trim()) e.sku = 'SKU is required'
    if (form.available_qty < 0) e.available_qty = 'Cannot be negative'
    if (form.min_stock_level < 0) e.min_stock_level = 'Cannot be negative'
    if (form.unit_price < 0) e.unit_price = 'Cannot be negative'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    setApiError('')
    try {
      const payload = { ...form, available_qty: Number(form.available_qty), min_stock_level: Number(form.min_stock_level), unit_price: Number(form.unit_price) }
      if (product?.id) {
        await inventoryAPI.updateProduct(product.id, payload)
      } else {
        await inventoryAPI.createProduct(payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={product ? 'Edit Product' : 'Add Product'} size="lg">
      <div className="p-6 space-y-4">
        {apiError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0" />{apiError}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Product Name" required error={errors.name}>
            <input className={inputCls(errors.name)} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Wireless Keyboard" />
          </FormField>
          <FormField label="SKU" required error={errors.sku}>
            <input className={inputCls(errors.sku)} value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="e.g. WK-001" />
          </FormField>
          <FormField label="Barcode" error={errors.barcode}>
            <input className={inputCls(errors.barcode)} value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="e.g. 123456789" />
          </FormField>
          <FormField label="Category" error={errors.category}>
            <input className={inputCls(errors.category)} value={form.category} onChange={e => set('category', e.target.value)} placeholder="e.g. Electronics" />
          </FormField>
          <FormField label="Available Qty" required error={errors.available_qty}>
            <input type="number" min="0" className={inputCls(errors.available_qty)} value={form.available_qty} onChange={e => set('available_qty', e.target.value)} />
          </FormField>
          <FormField label="Min Stock Level" required error={errors.min_stock_level}>
            <input type="number" min="0" className={inputCls(errors.min_stock_level)} value={form.min_stock_level} onChange={e => set('min_stock_level', e.target.value)} />
          </FormField>
          <FormField label="Unit Price ($)" error={errors.unit_price}>
            <input type="number" min="0" step="0.01" className={inputCls(errors.unit_price)} value={form.unit_price} onChange={e => set('unit_price', e.target.value)} />
          </FormField>
          <FormField label="Bin Location" error={errors.bin_location}>
            <select className={inputCls(errors.bin_location)} value={form.bin_location} onChange={e => set('bin_location', e.target.value)}>
              <option value="">— Select bin —</option>
              {binLocations.map(b => (
                <option key={b.id || b.code} value={b.code}>{b.code} {b.zone ? `(Zone ${b.zone})` : ''}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Status" error={errors.status}>
            <select className={inputCls(errors.status)} value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="Description" error={errors.description}>
          <textarea className={inputCls(errors.description) + ' resize-none'} rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional product description" />
        </FormField>
      </div>
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
          {saving ? <><RefreshCw className="w-4 h-4 animate-spin" />Saving…</> : <><CheckCircle className="w-4 h-4" />{product ? 'Update Product' : 'Add Product'}</>}
        </button>
      </div>
    </Modal>
  )
}

// ─── Adjust Stock Modal ───────────────────────────────────────────────────────

const EMPTY_ADJUST = { transaction_type: 'IN', quantity: 1, notes: '' }

function AdjustStockModal({ isOpen, onClose, product, onSaved }) {
  const [form, setForm] = useState(EMPTY_ADJUST)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    if (isOpen) { setForm(EMPTY_ADJUST); setErrors({}); setApiError('') }
  }, [isOpen])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.quantity || Number(form.quantity) <= 0) e.quantity = 'Must be greater than 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    setApiError('')
    try {
      await inventoryAPI.adjustStock(product.id, { ...form, quantity: Number(form.quantity) })
      onSaved()
      onClose()
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to adjust stock')
    } finally {
      setSaving(false)
    }
  }

  const txType = TRANSACTION_TYPES.find(t => t.value === form.transaction_type)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adjust Stock" size="sm">
      <div className="p-6 space-y-4">
        {product && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Current Stock</p>
            <p className="text-2xl font-bold text-blue-800 mt-1">{product.available_qty ?? 0}</p>
            <p className="text-xs text-blue-600 mt-0.5">{product.name} · {product.sku}</p>
          </div>
        )}
        {apiError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{apiError}</div>
        )}
        <FormField label="Transaction Type" required error={errors.transaction_type}>
          <select className={inputCls(errors.transaction_type)} value={form.transaction_type} onChange={e => set('transaction_type', e.target.value)}>
            {TRANSACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </FormField>
        <FormField label="Quantity" required error={errors.quantity}>
          <input type="number" min="1" className={inputCls(errors.quantity)} value={form.quantity} onChange={e => set('quantity', e.target.value)} />
        </FormField>
        <FormField label="Notes" error={errors.notes}>
          <textarea className={inputCls(errors.notes) + ' resize-none'} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes…" />
        </FormField>
        {txType && (
          <div className={`text-sm font-medium ${txType.color} bg-gray-50 rounded-lg px-3 py-2`}>
            → {txType.label} {form.quantity} unit{form.quantity !== 1 ? 's' : ''}
            {form.transaction_type === 'IN' && product && ` (new total: ${(product.available_qty ?? 0) + Number(form.quantity || 0)})`}
            {form.transaction_type === 'OUT' && product && ` (new total: ${Math.max(0, (product.available_qty ?? 0) - Number(form.quantity || 0))})`}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2">
          {saving ? <><RefreshCw className="w-4 h-4 animate-spin" />Saving…</> : 'Apply Adjustment'}
        </button>
      </div>
    </Modal>
  )
}

// ─── View Product / Transaction History Modal ─────────────────────────────────

function ViewProductModal({ isOpen, onClose, product }) {
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    if (isOpen && product?.id) {
      setLoadingHistory(true)
      inventoryAPI.getProduct(product.id)
        .then(res => setHistory(res.data.transactions || []))
        .catch(() => setHistory([]))
        .finally(() => setLoadingHistory(false))
    }
  }, [isOpen, product])

  const txIcon = (type) => {
    if (type === 'IN') return <TrendingUp className="w-4 h-4 text-green-600" />
    if (type === 'OUT') return <TrendingDown className="w-4 h-4 text-blue-600" />
    if (type === 'DAMAGE') return <AlertTriangle className="w-4 h-4 text-red-500" />
    return <ArrowUpDown className="w-4 h-4 text-purple-600" />
  }

  if (!product) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Product Details" size="lg">
      <div className="p-6 space-y-6">
        {/* Product info */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-3 flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-800">{product.name}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{product.description}</p>
            </div>
            <StatusBadge status={product.status} />
          </div>
          {[
            ['SKU', product.sku],
            ['Barcode', product.barcode],
            ['Category', product.category],
            ['Bin Location', product.bin_location],
            ['Unit Price', product.unit_price != null ? `$${Number(product.unit_price).toFixed(2)}` : '—'],
            ['Min Stock Level', product.min_stock_level],
          ].map(([k, v]) => (
            <div key={k} className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500 font-medium">{k}</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{v || '—'}</p>
            </div>
          ))}
        </div>

        {/* Stock overview */}
        <div className="grid grid-cols-3 gap-3">
          <div className={`rounded-xl p-4 text-center ${product.available_qty <= product.min_stock_level ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
            <p className="text-2xl font-bold text-gray-800">{product.available_qty ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Available</p>
            {product.available_qty <= product.min_stock_level && (
              <span className="text-xs text-red-600 font-medium">⚠ Low Stock</span>
            )}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{product.reserved_qty ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Reserved</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{(product.available_qty ?? 0) + (product.reserved_qty ?? 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Total</p>
          </div>
        </div>

        {/* Transaction history */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <History className="w-4 h-4" />Transaction History
          </h4>
          {loadingHistory ? (
            <div className="text-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-blue-500 mx-auto" /></div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No transactions found</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((tx, i) => (
                <div key={tx.id || i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">{txIcon(tx.transaction_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">{tx.transaction_type}</span>
                      <span className="text-sm text-gray-800 font-semibold">{tx.quantity > 0 ? '+' : ''}{tx.quantity}</span>
                      {tx.notes && <span className="text-xs text-gray-500 truncate">{tx.notes}</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {tx.created_by_name || tx.user || 'System'} · {tx.created_at ? new Date(tx.created_at).toLocaleString() : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Balance</p>
                    <p className="text-sm font-semibold text-gray-700">{tx.balance_after ?? '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── Barcode Lookup Widget ────────────────────────────────────────────────────

function BarcodeLookup() {
  const [barcode, setBarcode] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const timerRef = useRef(null)

  const lookup = useCallback(async (val) => {
    if (!val.trim()) { setResult(null); setError(''); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await inventoryAPI.lookupBarcode(val.trim())
      setResult(res.data.product || res.data)
    } catch {
      setError('No product found for this barcode')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setBarcode(val)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => lookup(val), 500)
  }

  const clear = () => { setBarcode(''); setResult(null); setError('') }

  return (
    <div className="relative">
      <div className="relative">
        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500" />
        <input
          value={barcode}
          onChange={handleChange}
          placeholder="Barcode lookup…"
          className="pl-9 pr-8 py-2 text-sm border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50 w-48 transition-all focus:w-64"
        />
        {barcode && (
          <button onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {/* Dropdown result */}
      {(loading || result || error) && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-3">
          {loading && <div className="flex items-center gap-2 text-sm text-gray-500"><RefreshCw className="w-4 h-4 animate-spin" />Looking up…</div>}
          {error && <div className="text-sm text-red-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}
          {result && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{result.name}</p>
                  <p className="text-xs text-gray-500">{result.sku} · {result.barcode}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-gray-800">{result.available_qty ?? 0}</p>
                  <p className="text-xs text-gray-500">Available</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-sm font-medium text-gray-700">{result.bin_location || '—'}</p>
                  <p className="text-xs text-gray-500">Bin</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <StatusBadge status={result.status} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { isManager } = useAuth()

  // Data
  const [products, setProducts]       = useState([])
  const [binLocations, setBinLocations] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')

  // Filters
  const [search, setSearch]           = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [lowStockOnly, setLowStockOnly]   = useState(false)
  const [categories, setCategories]   = useState([])

  // Sort
  const [sortKey, setSortKey]         = useState('name')
  const [sortDir, setSortDir]         = useState('asc')

  // Modals
  const [addEditModal, setAddEditModal]     = useState({ open: false, product: null })
  const [adjustModal, setAdjustModal]       = useState({ open: false, product: null })
  const [viewModal, setViewModal]           = useState({ open: false, product: null })
  const [deleteConfirm, setDeleteConfirm]   = useState({ open: false, product: null })

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = {}
      if (search) params.search = search
      if (categoryFilter) params.category = categoryFilter
      if (lowStockOnly) params.low_stock = true

      const [productsRes, binsRes] = await Promise.all([
        inventoryAPI.getProducts(params),
        inventoryAPI.getBinLocations(),
      ])
      const prods = productsRes.data.products || productsRes.data || []
      setProducts(prods)
      setBinLocations(binsRes.data.bin_locations || binsRes.data || [])
      // Extract unique categories
      const cats = [...new Set(prods.map(p => p.category).filter(Boolean))].sort()
      setCategories(cats)
    } catch (e) {
      setError('Failed to load inventory data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter, lowStockOnly])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const handleDelete = async () => {
    try {
      await inventoryAPI.deleteProduct(deleteConfirm.product.id)
      fetchData()
    } catch {
      // silent – let table reload show state
    }
  }

  // Local sort (server may not support it)
  const sorted = [...products].sort((a, b) => {
    const av = a[sortKey] ?? ''
    const bv = b[sortKey] ?? ''
    const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
    return sortDir === 'asc' ? cmp : -cmp
  })

  const SortIcon = ({ col }) => (
    <ArrowUpDown className={`w-3.5 h-3.5 ml-1 inline-block transition-opacity ${sortKey === col ? 'opacity-100 text-blue-600' : 'opacity-30'}`} />
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} product{products.length !== 1 ? 's' : ''} in catalogue</p>
        </div>
        <div className="flex items-center gap-3">
          <BarcodeLookup />
          {isManager() && (
            <button
              onClick={() => setAddEditModal({ open: true, product: null })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />Add Product
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, SKU, barcode…"
            className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setLowStockOnly(v => !v)}
            className={`w-11 h-6 rounded-full relative transition-colors ${lowStockOnly ? 'bg-orange-500' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${lowStockOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-orange-500" />Low Stock Only
          </span>
        </label>

        <button onClick={fetchData} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <p className="text-sm">Loading inventory…</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Package className="w-12 h-12 opacity-30" />
            <p className="text-sm font-medium">No products found</p>
            <p className="text-xs">Try adjusting your filters or add a product</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {[
                    ['name', 'Product'],
                    ['sku', 'SKU'],
                    ['barcode', 'Barcode'],
                    ['category', 'Category'],
                    ['available_qty', 'Available'],
                    ['reserved_qty', 'Reserved'],
                    [null, 'Total'],
                    ['min_stock_level', 'Min Level'],
                    ['bin_location', 'Bin'],
                    ['unit_price', 'Price'],
                    ['status', 'Status'],
                    [null, 'Actions'],
                  ].map(([col, label]) => (
                    <th
                      key={label}
                      className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left whitespace-nowrap ${col ? 'cursor-pointer hover:text-blue-600 select-none' : ''}`}
                      onClick={col ? () => handleSort(col) : undefined}
                    >
                      {label}{col && <SortIcon col={col} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map(product => {
                  const isLow = product.available_qty <= product.min_stock_level
                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-gray-50 transition-colors ${isLow ? 'bg-yellow-50 hover:bg-yellow-100' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />}
                          <span className="font-medium text-gray-800">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{product.sku}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{product.barcode || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{product.category || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
                          {product.available_qty ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-blue-600 font-medium">{product.reserved_qty ?? 0}</td>
                      <td className="px-4 py-3 text-gray-700 font-semibold">{(product.available_qty ?? 0) + (product.reserved_qty ?? 0)}</td>
                      <td className="px-4 py-3 text-gray-600">{product.min_stock_level ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-mono text-xs">
                          {product.bin_location || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {product.unit_price != null ? `$${Number(product.unit_price).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={product.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewModal({ open: true, product })}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isManager() && (
                            <button
                              onClick={() => setAddEditModal({ open: true, product })}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Edit Product"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setAdjustModal({ open: true, product })}
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Adjust Stock"
                          >
                            <Layers className="w-4 h-4" />
                          </button>
                          {isManager() && (
                            <button
                              onClick={() => setDeleteConfirm({ open: true, product })}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <ProductModal
        isOpen={addEditModal.open}
        onClose={() => setAddEditModal({ open: false, product: null })}
        product={addEditModal.product}
        binLocations={binLocations}
        onSaved={fetchData}
      />
      <AdjustStockModal
        isOpen={adjustModal.open}
        onClose={() => setAdjustModal({ open: false, product: null })}
        product={adjustModal.product}
        onSaved={fetchData}
      />
      <ViewProductModal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, product: null })}
        product={viewModal.product}
      />
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, product: null })}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteConfirm.product?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Product"
        danger
      />
    </div>
  )
}
