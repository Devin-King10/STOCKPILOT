import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Package, ArrowLeft, CheckCircle2, XCircle, AlertTriangle,
  Loader2, ChevronRight, ClipboardCheck, Box, Scale,
  AlertCircle, CheckSquare, Square
} from 'lucide-react'
import { packingAPI } from '../services/api'

// ── Helpers ──────────────────────────────────────────────────────────────────

const Toast = ({ toasts }) => (
  <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
    {toasts.map(t => (
      <div key={t.id} className={`pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-white text-sm flex items-center gap-2 max-w-sm transition-all
        ${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}>
        {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
        {t.message}
      </div>
    ))}
  </div>
)

const useToast = () => {
  const [toasts, setToasts] = useState([])
  const show = (message, type = 'info') => {
    const id = Date.now()
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }
  return { toasts, success: m => show(m, 'success'), error: m => show(m, 'error'), info: m => show(m, 'info') }
}

const ItemStatusBadge = ({ status }) => {
  const map = {
    PENDING:  { cls: 'bg-blue-100 text-blue-700',   label: 'Pending' },
    VERIFIED: { cls: 'bg-green-100 text-green-700',  label: 'Verified' },
    DAMAGED:  { cls: 'bg-orange-100 text-orange-700',label: 'Damaged' },
    MISSING:  { cls: 'bg-red-100 text-red-700',      label: 'Missing' },
  }
  const { cls, label } = map[status] ?? { cls: 'bg-gray-100 text-gray-700', label: status }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
}

const PriorityBadge = ({ priority }) => {
  const map = {
    LOW:    'bg-gray-100  text-gray-700',
    NORMAL: 'bg-blue-100  text-blue-700',
    HIGH:   'bg-orange-100 text-orange-700',
    URGENT: 'bg-red-100   text-red-700',
  }
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${map[priority] ?? 'bg-gray-100 text-gray-700'}`}>{priority}</span>
}

// Modal wrapper
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 z-10" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const CHECKLIST_LABELS = [
  'Product quantity verified',
  'Product condition verified',
  'Correct order items confirmed',
  'Packaging completed',
  'Shipping label prepared',
]

const PACKAGE_TYPES = ['Standard Box', 'Fragile Padded', 'Envelope', 'Pallet']

export default function PackingTaskPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [task, setTask]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  // Per-item state keyed by item id
  const [itemInputs, setItemInputs]   = useState({})   // { [itemId]: { qty, conditionOk } }
  const [verifying, setVerifying]     = useState({})   // { [itemId]: bool }

  // Checklist
  const [checklist, setChecklist]     = useState({})   // { [index]: bool }
  const [checklistLoading, setChecklistLoading] = useState({})

  // Package details
  const [pkgDetails, setPkgDetails]   = useState({ dimensions: '', weight: '', package_type: 'Standard Box' })

  // Completing
  const [completing, setCompleting]   = useState(false)

  // Error report modal
  const [errorModal, setErrorModal]   = useState(false)
  const [errorForm, setErrorForm]     = useState({ error_type: 'DAMAGE', description: '' })
  const [submittingError, setSubmittingError] = useState(false)

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchTask = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await packingAPI.getTask(id)
      const t = res.data.task ?? res.data
      setTask(t)

      // Seed checklist from API data
      const cl = {}
      if (Array.isArray(t.checklist)) {
        t.checklist.forEach((val, i) => { cl[i] = !!val })
      } else if (t.checklist && typeof t.checklist === 'object') {
        Object.entries(t.checklist).forEach(([k, v]) => { cl[Number(k)] = !!v })
      } else {
        CHECKLIST_LABELS.forEach((_, i) => { cl[i] = false })
      }
      setChecklist(cl)

      // Seed package details
      setPkgDetails({
        dimensions:   t.package_dimensions ?? '',
        weight:       t.package_weight     ?? '',
        package_type: t.package_type       ?? 'Standard Box',
      })

      // Seed item inputs
      const inputs = {}
      const items = t.items ?? []
      items.forEach(item => {
        inputs[item.id] = {
          qty:         item.verified_qty ?? item.picked_qty ?? '',
          conditionOk: item.condition_verified ?? false,
        }
      })
      setItemInputs(inputs)
    } catch (e) {
      setError(e?.response?.data?.message ?? 'Failed to load packing task.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchTask() }, [fetchTask])

  // ── Item verification ─────────────────────────────────────────────────────

  const handleVerifyItem = async (item) => {
    const inputs = itemInputs[item.id] ?? {}
    if (!inputs.qty && inputs.qty !== 0) {
      toast.error('Please enter verified quantity.')
      return
    }
    setVerifying(p => ({ ...p, [item.id]: true }))
    try {
      await packingAPI.verifyItem(id, {
        item_id:            item.id,
        verified_qty:       Number(inputs.qty),
        condition_verified: !!inputs.conditionOk,
      })
      toast.success(`Item "${item.product_name}" verified.`)
      fetchTask()
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Verification failed.')
    } finally {
      setVerifying(p => ({ ...p, [item.id]: false }))
    }
  }

  // ── Checklist ─────────────────────────────────────────────────────────────

  const handleChecklistToggle = async (index) => {
    const newVal = !checklist[index]
    setChecklistLoading(p => ({ ...p, [index]: true }))
    try {
      const newChecklist = { ...checklist, [index]: newVal }
      await packingAPI.updateChecklist(id, {
        checklist_index: index,
        checked:         newVal,
      })
      setChecklist(newChecklist)
      toast.success(newVal ? `Step ${index + 1} checked.` : `Step ${index + 1} unchecked.`)
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Failed to update checklist.')
    } finally {
      setChecklistLoading(p => ({ ...p, [index]: false }))
    }
  }

  // ── Complete packing ──────────────────────────────────────────────────────

  const allChecked    = CHECKLIST_LABELS.every((_, i) => checklist[i])
  const detailsFilled = pkgDetails.dimensions.trim() !== '' && pkgDetails.weight !== ''
  const canComplete   = allChecked && detailsFilled

  const handleComplete = async () => {
    if (!canComplete) return
    setCompleting(true)
    try {
      await packingAPI.complete(id, {
        package_dimensions: pkgDetails.dimensions,
        package_weight:     Number(pkgDetails.weight),
        package_type:       pkgDetails.package_type,
      })
      toast.success('Packing completed successfully!')
      setTimeout(() => navigate('/packing'), 1500)
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Failed to complete packing.')
      setCompleting(false)
    }
  }

  // ── Error report ──────────────────────────────────────────────────────────

  const handleReportError = async () => {
    if (!errorForm.description.trim()) {
      toast.error('Please describe the issue.')
      return
    }
    setSubmittingError(true)
    try {
      await packingAPI.reportError(id, errorForm)
      toast.success('Error reported.')
      setErrorModal(false)
      setErrorForm({ error_type: 'DAMAGE', description: '' })
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Failed to report error.')
    } finally {
      setSubmittingError(false)
    }
  }

  // ── Progress ──────────────────────────────────────────────────────────────

  const items = task?.items ?? []
  const verifiedCount = items.filter(i => i.status === 'VERIFIED').length
  const progressPct   = items.length > 0 ? Math.round((verifiedCount / items.length) * 100) : 0

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
    </div>
  )

  if (error) return (
    <div className="p-8 flex flex-col items-center gap-4">
      <AlertCircle className="w-12 h-12 text-red-500" />
      <p className="text-red-700 text-lg">{error}</p>
      <button onClick={() => navigate('/packing')} className="px-4 py-2 bg-purple-600 text-white rounded-lg">Back to Packing</button>
    </div>
  )

  const orderNo   = task?.order_number  ?? task?.order?.order_number  ?? `#${id}`
  const customer  = task?.customer_name ?? task?.order?.customer_name ?? '—'
  const priority  = task?.priority      ?? task?.order?.priority      ?? 'NORMAL'

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast toasts={toast.toasts} />

      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/packing')} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                Packing Task — <span className="font-mono">{orderNo}</span>
              </h1>
              <p className="text-sm text-gray-500">{customer}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PriorityBadge priority={priority} />
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-purple-700">{progressPct}%</span> verified
            </div>
            <button
              onClick={() => setErrorModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition"
            >
              <AlertTriangle className="w-4 h-4" /> Report Error
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="max-w-5xl mx-auto px-6 pb-3">
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-2 bg-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{verifiedCount} of {items.length} items verified</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left col: Items ────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-purple-600" />
            Item Verification
          </h2>

          {items.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              No items found for this task.
            </div>
          )}

          {items.map(item => {
            const inp = itemInputs[item.id] ?? { qty: '', conditionOk: false }
            const isVerified = item.status === 'VERIFIED'
            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border p-5 shadow-sm transition
                  ${isVerified ? 'border-green-200 bg-green-50/40' : 'border-gray-200'}`}
              >
                {/* Item header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.product_name}</h3>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">SKU: {item.sku ?? '—'}</p>
                  </div>
                  <ItemStatusBadge status={item.status ?? 'PENDING'} />
                </div>

                {/* Qty row */}
                <div className="grid grid-cols-3 gap-3 text-center mb-4">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">Ordered</p>
                    <p className="text-lg font-bold text-gray-900">{item.ordered_qty ?? '—'}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2">
                    <p className="text-xs text-blue-600">Picked</p>
                    <p className="text-lg font-bold text-blue-800">{item.picked_qty ?? '—'}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-2">
                    <p className="text-xs text-purple-600">Verified Qty</p>
                    <input
                      type="number"
                      min="0"
                      max={item.picked_qty ?? 9999}
                      value={inp.qty}
                      onChange={e => setItemInputs(p => ({ ...p, [item.id]: { ...inp, qty: e.target.value } }))}
                      disabled={isVerified}
                      className="w-full text-center text-lg font-bold text-purple-800 bg-transparent border-b-2 border-purple-300 focus:outline-none focus:border-purple-600 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Condition checkbox */}
                <label className={`flex items-center gap-2 mb-4 cursor-pointer select-none ${isVerified ? 'opacity-50' : ''}`}>
                  <input
                    type="checkbox"
                    checked={!!inp.conditionOk}
                    onChange={e => setItemInputs(p => ({ ...p, [item.id]: { ...inp, conditionOk: e.target.checked } }))}
                    disabled={isVerified}
                    className="w-4 h-4 accent-purple-600"
                  />
                  <span className="text-sm text-gray-700">Condition verified — item is undamaged</span>
                </label>

                {/* Verify button */}
                {!isVerified && (
                  <button
                    onClick={() => handleVerifyItem(item)}
                    disabled={verifying[item.id]}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-60 transition"
                  >
                    {verifying[item.id]
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <CheckCircle2 className="w-4 h-4" />}
                    Verify Item
                  </button>
                )}
                {isVerified && (
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Item verified
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Right col: Checklist + Package Details ─────────────────────── */}
        <div className="space-y-5">

          {/* Packing Checklist */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <ClipboardCheck className="w-5 h-5 text-indigo-600" />
              Packing Checklist
            </h2>
            <ul className="space-y-3">
              {CHECKLIST_LABELS.map((label, i) => {
                const checked = !!checklist[i]
                const busy    = !!checklistLoading[i]
                return (
                  <li key={i}>
                    <button
                      onClick={() => handleChecklistToggle(i)}
                      disabled={busy}
                      className="flex items-center gap-3 w-full text-left group disabled:opacity-60"
                    >
                      <span className="flex-shrink-0">
                        {busy
                          ? <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                          : checked
                            ? <CheckSquare className="w-5 h-5 text-indigo-600" />
                            : <Square className="w-5 h-5 text-gray-400 group-hover:text-indigo-400 transition" />}
                      </span>
                      <span className={`text-sm transition ${checked ? 'line-through text-gray-400' : 'text-gray-700 group-hover:text-gray-900'}`}>
                        {label}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-1.5 bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${(Object.values(checklist).filter(Boolean).length / CHECKLIST_LABELS.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 font-medium">
                {Object.values(checklist).filter(Boolean).length}/{CHECKLIST_LABELS.length}
              </span>
            </div>
          </div>

          {/* Package Details */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <Box className="w-5 h-5 text-blue-600" />
              Package Details
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dimensions</label>
                <input
                  type="text"
                  placeholder="e.g. 40x30x20 cm"
                  value={pkgDetails.dimensions}
                  onChange={e => setPkgDetails(p => ({ ...p, dimensions: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <Scale className="w-3 h-3" /> Weight (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g. 1.5"
                  value={pkgDetails.weight}
                  onChange={e => setPkgDetails(p => ({ ...p, weight: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Package Type</label>
                <select
                  value={pkgDetails.package_type}
                  onChange={e => setPkgDetails(p => ({ ...p, package_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {PACKAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Complete button */}
          <div>
            {!canComplete && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 space-y-1">
                {!allChecked && <p className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Complete all 5 checklist items</p>}
                {!detailsFilled && <p className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Fill in package dimensions and weight</p>}
              </div>
            )}
            <button
              onClick={handleComplete}
              disabled={!canComplete || completing}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition
                ${canComplete && !completing
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              {completing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Completing…</>
                : <><CheckCircle2 className="w-4 h-4" /> Complete Packing</>}
            </button>
          </div>
        </div>
      </div>

      {/* Error Report Modal */}
      <Modal open={errorModal} onClose={() => setErrorModal(false)} title="Report Packing Error">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Error Type</label>
            <select
              value={errorForm.error_type}
              onChange={e => setErrorForm(p => ({ ...p, error_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="DAMAGE">Damage</option>
              <option value="MISSING_ITEM">Missing Item</option>
              <option value="WRONG_ITEM">Wrong Item</option>
              <option value="QUANTITY_MISMATCH">Quantity Mismatch</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={4}
              placeholder="Describe the issue in detail…"
              value={errorForm.description}
              onChange={e => setErrorForm(p => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setErrorModal(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleReportError}
              disabled={submittingError}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition flex items-center gap-2"
            >
              {submittingError && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Report
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
