import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  TrendingUp, Package, Clock, CheckCircle, AlertTriangle,
  Download, Users, RefreshCw, BarChart2
} from 'lucide-react'
import { analyticsAPI } from '../services/api'
import { useToast } from '../context/ToastContext'

const PERIODS = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: '7days' },
  { label: 'Last 30 Days', value: '30days' },
  { label: 'All Time', value: 'all' },
]

const EXPORT_TYPES = [
  { label: 'Orders Report', type: 'orders', icon: Package },
  { label: 'Inventory Report', type: 'inventory', icon: BarChart2 },
  { label: 'Errors Report', type: 'errors', icon: AlertTriangle },
  { label: 'Fulfillment Report', type: 'fulfillment', icon: TrendingUp },
]

function getAccuracyColor(value) {
  if (value == null) return 'text-gray-500'
  if (value > 95) return 'text-green-600'
  if (value > 85) return 'text-yellow-500'
  return 'text-red-500'
}

function getAccuracyBg(value) {
  if (value == null) return 'bg-gray-100'
  if (value > 95) return 'bg-green-50 border-green-200'
  if (value > 85) return 'bg-yellow-50 border-yellow-200'
  return 'bg-red-50 border-red-200'
}

function KPICard({ icon: Icon, label, value, suffix = '', colorClass = 'text-blue-600', bgClass = 'bg-blue-50' }) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-2 shadow-sm ${bgClass}`}>
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-lg bg-white shadow-sm`}>
          <Icon size={18} className={colorClass} />
        </div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-tight">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${colorClass}`}>
        {value == null ? '—' : `${value}${suffix}`}
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('7days')
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { showToast } = useToast()

  const fetchSummary = useCallback(async (p, isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await analyticsAPI.getSummary({ period: p })
      setSummary(res.data)
    } catch (err) {
      showToast('Failed to load analytics data', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchSummary(period)
  }, [period, fetchSummary])

  const handleExport = (type) => {
    const url = analyticsAPI.exportCsv(type)
    const token = localStorage.getItem('stockpilot_token')
    // Create a hidden link with token in URL as query param fallback
    const link = document.createElement('a')
    link.href = `${url}?token=${encodeURIComponent(token || '')}`
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.click()
  }

  const kpi = summary?.kpi || {}
  const dailyDispatches = summary?.daily_dispatches || []
  const employeePerformance = summary?.employee_performance || []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics &amp; Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Warehouse performance insights</p>
        </div>
        <button
          onClick={() => fetchSummary(period, true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Period Filter */}
      <div className="flex gap-2 flex-wrap">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard
          icon={Package}
          label="Total Orders Processed"
          value={kpi.total_orders}
          colorClass="text-blue-600"
          bgClass="bg-blue-50 border border-blue-100"
        />
        <KPICard
          icon={CheckCircle}
          label="Dispatched Count"
          value={kpi.dispatched_count}
          colorClass="text-green-600"
          bgClass="bg-green-50 border border-green-100"
        />
        <KPICard
          icon={Clock}
          label="Avg Cycle Time"
          value={kpi.avg_cycle_time != null ? Number(kpi.avg_cycle_time).toFixed(1) : null}
          suffix=" hrs"
          colorClass="text-purple-600"
          bgClass="bg-purple-50 border border-purple-100"
        />
        <KPICard
          icon={Clock}
          label="Avg Picking Time"
          value={kpi.avg_picking_time != null ? Number(kpi.avg_picking_time).toFixed(1) : null}
          suffix=" min"
          colorClass="text-orange-600"
          bgClass="bg-orange-50 border border-orange-100"
        />
        <KPICard
          icon={Clock}
          label="Avg Packing Time"
          value={kpi.avg_packing_time != null ? Number(kpi.avg_packing_time).toFixed(1) : null}
          suffix=" min"
          colorClass="text-indigo-600"
          bgClass="bg-indigo-50 border border-indigo-100"
        />
        {/* Accuracy cards with dynamic coloring */}
        <div className={`rounded-xl border p-4 flex flex-col gap-2 shadow-sm ${getAccuracyBg(kpi.picking_accuracy)}`}>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-white shadow-sm">
              <TrendingUp size={18} className={getAccuracyColor(kpi.picking_accuracy)} />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Picking Accuracy</span>
          </div>
          <div className={`text-2xl font-bold ${getAccuracyColor(kpi.picking_accuracy)}`}>
            {kpi.picking_accuracy != null ? `${Number(kpi.picking_accuracy).toFixed(1)}%` : '—'}
          </div>
        </div>
        <div className={`rounded-xl border p-4 flex flex-col gap-2 shadow-sm ${getAccuracyBg(kpi.packing_accuracy)}`}>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-white shadow-sm">
              <TrendingUp size={18} className={getAccuracyColor(kpi.packing_accuracy)} />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Packing Accuracy</span>
          </div>
          <div className={`text-2xl font-bold ${getAccuracyColor(kpi.packing_accuracy)}`}>
            {kpi.packing_accuracy != null ? `${Number(kpi.packing_accuracy).toFixed(1)}%` : '—'}
          </div>
        </div>
        <KPICard
          icon={AlertTriangle}
          label="Total Picking Errors"
          value={kpi.total_picking_errors}
          colorClass="text-red-600"
          bgClass="bg-red-50 border border-red-100"
        />
        <KPICard
          icon={AlertTriangle}
          label="Total Packing Errors"
          value={kpi.total_packing_errors}
          colorClass="text-rose-600"
          bgClass="bg-rose-50 border border-rose-100"
        />
        <KPICard
          icon={Clock}
          label="Delayed Orders"
          value={kpi.delayed_orders_count}
          colorClass="text-amber-600"
          bgClass="bg-amber-50 border border-amber-100"
        />
      </div>

      {/* Daily Dispatch Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Daily Dispatches</h2>
        {dailyDispatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <BarChart2 size={32} className="mb-2 opacity-30" />
            <p className="text-sm">No dispatch data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailyDispatches} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={d => {
                try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) } catch { return d }
              }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                formatter={(val) => [val, 'Dispatched']}
                labelFormatter={(label) => {
                  try { return new Date(label).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) } catch { return label }
                }}
              />
              <Legend />
              <Bar dataKey="count" name="Dispatched Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Employee Performance Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Employee Performance</h2>
        </div>
        {employeePerformance.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-gray-400">
            <p className="text-sm">No performance data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Name</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Role</th>
                  <th className="text-center py-2 px-3 text-gray-500 font-medium">Assigned</th>
                  <th className="text-center py-2 px-3 text-gray-500 font-medium">Completed</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Completion Rate</th>
                </tr>
              </thead>
              <tbody>
                {employeePerformance.map((emp, idx) => {
                  const rate = emp.assigned_tasks > 0
                    ? Math.round((emp.completed_tasks / emp.assigned_tasks) * 100)
                    : 0
                  return (
                    <tr key={emp.id || idx} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium text-gray-800">{emp.full_name || emp.name}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                          {emp.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-gray-700">{emp.assigned_tasks ?? 0}</td>
                      <td className="py-3 px-3 text-center text-gray-700">{emp.completed_tasks ?? 0}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                rate >= 90 ? 'bg-green-500' : rate >= 70 ? 'bg-yellow-500' : 'bg-red-400'
                              }`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600 w-10 text-right">{rate}%</span>
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

      {/* Export Buttons */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Download size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Export Reports</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {EXPORT_TYPES.map(({ label, type, icon: Icon }) => (
            <button
              key={type}
              onClick={() => handleExport(type)}
              className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors group text-sm font-medium text-gray-700"
            >
              <Download size={14} className="text-gray-400 group-hover:text-blue-600" />
              <span className="group-hover:text-blue-700">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
