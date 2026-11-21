import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package, Play, ExternalLink, CheckCircle2, Clock, Loader2,
  RefreshCw, Search, Filter, AlertCircle
} from 'lucide-react'
import { packingAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

// ── inline micro-components (no external component folder yet) ──────────────

const StatusBadge = ({ status }) => {
  const map = {
    PENDING:     'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-purple-100 text-purple-800',
    COMPLETED:   'bg-green-100  text-green-800',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-800'}`}>
      {status?.replace('_', ' ')}
    </span>
  )
}

const PriorityBadge = ({ priority }) => {
  const map = {
    LOW:    'bg-gray-100  text-gray-700',
    NORMAL: 'bg-blue-100  text-blue-700',
    HIGH:   'bg-orange-100 text-orange-700',
    URGENT: 'bg-red-100   text-red-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${map[priority] ?? 'bg-gray-100 text-gray-700'}`}>
      {priority}
    </span>
  )
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
  </div>
)

const EmptyState = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
    <Package className="w-16 h-16 mb-4 opacity-30" />
    <p className="text-lg">{message}</p>
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────

export default function PackingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tasks, setTasks]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [statusFilter, setStatus] = useState('ALL')
  const [search, setSearch]       = useState('')
  const [starting, setStarting]   = useState(null)   // task id being started

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (statusFilter !== 'ALL') params.status = statusFilter
      if (search.trim())          params.search  = search.trim()
      const res = await packingAPI.getTasks(params)
      setTasks(res.data.tasks ?? res.data ?? [])
    } catch (e) {
      setError(e?.response?.data?.message ?? 'Failed to load packing tasks.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleStartPacking = async (task) => {
    setStarting(task.id)
    try {
      await packingAPI.startPacking(task.id)
      navigate(`/packing/${task.id}`)
    } catch (e) {
      alert(e?.response?.data?.message ?? 'Could not start packing.')
      setStarting(null)
    }
  }

  const handleOpenTask = (task) => navigate(`/packing/${task.id}`)

  const statuses = ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED']

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-purple-600" />
            Packing Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and track all packing tasks
          </p>
        </div>
        <button
          onClick={fetchTasks}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order #, customer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {statuses.map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  statusFilter === s
                    ? 'bg-white text-purple-700 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : tasks.length === 0 ? (
        <EmptyState message="No packing tasks found" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Order #', 'Customer', 'Priority', 'Packer', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {tasks.map(task => {
                  const isCompleted = task.status === 'COMPLETED'
                  const isPending   = task.status === 'PENDING'
                  return (
                    <tr key={task.id} className={`hover:bg-gray-50 transition ${isCompleted ? 'opacity-75' : ''}`}>
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-gray-900 text-sm">
                          {task.order_number ?? task.order?.order_number ?? `#${task.id}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-800">
                          {task.customer_name ?? task.order?.customer_name ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={task.priority ?? task.order?.priority ?? 'NORMAL'} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">
                          {task.packer_name ?? task.packer?.name ?? (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {task.created_at
                          ? new Date(task.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                              <CheckCircle2 className="w-4 h-4" /> Done
                            </span>
                          ) : isPending ? (
                            <button
                              onClick={() => handleStartPacking(task)}
                              disabled={starting === task.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-60 transition"
                            >
                              {starting === task.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Play className="w-3 h-3" />}
                              Start Packing
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-purple-600 text-sm font-medium">
                              <Clock className="w-4 h-4" /> In Progress
                            </span>
                          )}
                          {!isPending && (
                            <button
                              onClick={() => handleOpenTask(task)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition"
                            >
                              <ExternalLink className="w-3 h-3" /> Open Task
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
        </div>
      )}

      {/* Summary footer */}
      {!loading && tasks.length > 0 && (
        <p className="mt-3 text-sm text-gray-500">
          Showing {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
