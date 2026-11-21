import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, Play, ArrowRight, CheckCircle, Search,
  Filter, RefreshCw, User, Package, ChevronDown,
} from 'lucide-react'
import { pickingAPI, usersAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import PriorityBadge from '../components/PriorityBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import Pagination from '../components/Pagination'

const STATUS_OPTIONS = ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED']

const statusConfig = {
  PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 border border-yellow-200' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-blue-100 text-blue-800 border border-blue-200' },
  COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-800 border border-green-200' },
}

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {status === 'COMPLETED' && <CheckCircle className="w-3 h-3 mr-1" />}
      {cfg.label}
    </span>
  )
}

function ProgressBar({ picked, total }) {
  const pct = total > 0 ? Math.round((picked / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 whitespace-nowrap">{picked}/{total}</span>
    </div>
  )
}

export default function PickingPage() {
  const { user, isManager } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(null)
  const [filters, setFilters] = useState({ status: 'ALL', search: '', picker_id: '' })
  const [pickers, setPickers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 })

  const fetchTasks = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = { page, limit: 15 }
      if (filters.status !== 'ALL') params.status = filters.status
      if (filters.search) params.order_number = filters.search
      if (isManager() && filters.picker_id) params.picker_id = filters.picker_id
      const res = await pickingAPI.getTasks(params)
      const data = res.data
      setTasks(data.tasks || data.data || [])
      setPagination({
        page: data.page || 1,
        total: data.total || 0,
        pages: data.pages || 1,
      })
    } catch (err) {
      showToast('Failed to load picking tasks', 'error')
    } finally {
      setLoading(false)
    }
  }, [filters, isManager, showToast])

  useEffect(() => { fetchTasks(1) }, [fetchTasks])

  useEffect(() => {
    if (isManager()) {
      usersAPI.getStaffByRole('picker').then(res => {
        setPickers(res.data.users || res.data || [])
      }).catch(() => {})
    }
  }, [isManager])

  const handleStart = async (task) => {
    setStarting(task.id)
    try {
      await pickingAPI.startTask(task.id)
      showToast(`Task #${task.task_number} started!`, 'success')
      navigate(`/picking/${task.id}`)
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to start task', 'error')
    } finally {
      setStarting(null)
    }
  }

  const handleResume = (task) => navigate(`/picking/${task.id}`)

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-blue-600" />
            Picking Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isManager() ? 'Manage and monitor all picking tasks' : 'Your assigned picking tasks'}
          </p>
        </div>
        <button onClick={() => fetchTasks(pagination.page)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order number..."
            value={filters.search}
            onChange={e => handleFilterChange('search', e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filters.status}
            onChange={e => handleFilterChange('status', e.target.value)}
            className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.replace('_', ' ')}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Picker filter (manager only) */}
        {isManager() && (
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filters.picker_id}
              onChange={e => handleFilterChange('picker_id', e.target.value)}
              className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              <option value="">All Pickers</option>
              {pickers.map(p => (
                <option key={p.id} value={p.id}>{p.full_name || p.username}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20"><LoadingSpinner /></div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="w-12 h-12 text-gray-300" />}
            message="No picking tasks found"
            description={filters.status !== 'ALL' || filters.search ? 'Try adjusting your filters' : 'Picking tasks will appear here when orders are ready'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Task #', 'Order #', 'Customer', 'Picker', 'Status', 'Progress', 'Priority', 'Created At', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.map(task => (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    {/* Task # */}
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-blue-700">#{task.task_number || task.id}</span>
                    </td>
                    {/* Order # */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-gray-700">{task.order?.order_number || task.order_number || '—'}</span>
                    </td>
                    {/* Customer */}
                    <td className="px-4 py-3">
                      <span className="text-gray-800">{task.order?.customer_name || task.customer_name || '—'}</span>
                    </td>
                    {/* Picker */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-700">{task.picker?.full_name || task.picker?.username || task.picker_name || '—'}</span>
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    {/* Progress */}
                    <td className="px-4 py-3 min-w-[140px]">
                      <ProgressBar
                        picked={task.picked_items ?? task.items_picked ?? 0}
                        total={task.total_items ?? task.items_count ?? 0}
                      />
                    </td>
                    {/* Priority */}
                    <td className="px-4 py-3">
                      <PriorityBadge priority={task.order?.priority || task.priority || 'NORMAL'} />
                    </td>
                    {/* Created At */}
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {task.created_at ? new Date(task.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      {task.status === 'PENDING' && (
                        <button
                          onClick={() => handleStart(task)}
                          disabled={starting === task.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {starting === task.id ? (
                            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                          ) : <Play className="w-3 h-3" />}
                          Start Task
                        </button>
                      )}
                      {task.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleResume(task)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600 transition-colors"
                        >
                          <ArrowRight className="w-3 h-3" /> Resume Task
                        </button>
                      )}
                      {task.status === 'COMPLETED' && (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">Completed</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.pages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            onPageChange={(p) => fetchTasks(p)}
          />
        </div>
      )}
    </div>
  )
}
