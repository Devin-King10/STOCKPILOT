import React, { useState, useEffect, useCallback } from 'react'
import {
  ShoppingCart, Clock, Package, Archive, Truck, CheckCircle,
  AlertTriangle, XCircle, TrendingUp, RefreshCw, Bell, BoxSelect,
  Activity, ChevronRight, AlertCircle, Boxes
} from 'lucide-react'
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { dashboardAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import KPICard from '../components/KPICard'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import LoadingSpinner from '../components/LoadingSpinner'

// ─── Pie chart colours ───────────────────────────────────────────────────────
const PIE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#f97316', '#6366f1',
  '#14b8a6', '#ec4899',
]

// ─── KPI configuration ───────────────────────────────────────────────────────
const KPI_CONFIG = [
  {
    key: 'total_orders',
    label: 'Total Orders',
    icon: ShoppingCart,
    color: 'blue',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    key: 'pending_orders',
    label: 'Pending Orders',
    icon: Clock,
    color: 'yellow',
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
  },
  {
    key: 'being_picked',
    label: 'Being Picked',
    icon: Package,
    color: 'cyan',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
  },
  {
    key: 'awaiting_packing',
    label: 'Awaiting Packing',
    icon: Archive,
    color: 'orange',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
  },
  {
    key: 'ready_for_dispatch',
    label: 'Ready for Dispatch',
    icon: Truck,
    color: 'emerald',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    key: 'dispatched',
    label: 'Dispatched',
    icon: CheckCircle,
    color: 'green',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  {
    key: 'picking_errors',
    label: 'Picking Errors',
    icon: AlertTriangle,
    color: 'red',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  {
    key: 'packing_errors',
    label: 'Packing Errors',
    icon: XCircle,
    color: 'rose',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
  },
]

// ─── Section header ──────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-blue-600" />
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
    </div>
  )
}

// ─── Custom tooltip for recharts ──────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-2 text-sm">
      {label && <p className="font-medium text-gray-700 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth()

  const [stats, setStats] = useState(null)
  const [charts, setCharts] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [recentActivities, setRecentActivities] = useState([])
  const [delayedOrders, setDelayedOrders] = useState([])
  const [lowStockAlerts, setLowStockAlerts] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [
        statsRes,
        chartsRes,
        ordersRes,
        activitiesRes,
        delayedRes,
        lowStockRes,
      ] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getCharts(),
        dashboardAPI.getRecentOrders(),
        dashboardAPI.getRecentActivities(),
        dashboardAPI.getDelayedOrders(),
        dashboardAPI.getLowStockAlerts(),
      ])
      setStats(statsRes.data)
      setCharts(chartsRes.data)
      setRecentOrders(ordersRes.data?.orders || ordersRes.data || [])
      setRecentActivities(activitiesRes.data?.activities || activitiesRes.data || [])
      setDelayedOrders(delayedRes.data?.orders || delayedRes.data || [])
      setLowStockAlerts(lowStockRes.data?.alerts || lowStockRes.data || [])
      setLastRefreshed(new Date())
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
        <LoadingSpinner />
        <p className="text-gray-500 text-sm">Loading dashboard…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-gray-700 font-medium">{error}</p>
        <button
          onClick={fetchAll}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    )
  }

  const dailyFulfillment = charts?.daily_fulfillment || []
  const statusDistribution = charts?.status_distribution || []
  const accuracyData = charts?.accuracy_data || []

  return (
    <div className="p-6 space-y-8 max-w-screen-2xl mx-auto">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouse Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Welcome back, <span className="font-medium text-blue-600">{user?.full_name || user?.username}</span>
            {user?.role && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium capitalize">
                {user.role}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-gray-400">
              Updated {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* ── Delayed orders alert ── */}
      {delayedOrders.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <Bell className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800 text-sm">
              {delayedOrders.length} Delayed Order{delayedOrders.length > 1 ? 's' : ''} Require Attention
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              {delayedOrders.slice(0, 5).map((o) => (
                <span key={o.id || o.order_number} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
                  {o.order_number}
                </span>
              ))}
              {delayedOrders.length > 5 && (
                <span className="text-xs text-amber-600">+{delayedOrders.length - 5} more</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div>
        <SectionHeader icon={TrendingUp} title="Key Performance Indicators" />
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-4">
          {KPI_CONFIG.map((kpi) => (
            <KPICard
              key={kpi.key}
              label={kpi.label}
              value={stats?.[kpi.key] ?? stats?.[`orders_${kpi.key}`] ?? stats?.[`${kpi.key}_orders`] ?? stats?.[kpi.key.replace('being_', 'orders_being_')] ?? '—'}
              icon={kpi.icon}
              iconBg={kpi.iconBg}
              iconColor={kpi.iconColor}
            />
          ))}
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Line chart – Daily fulfillment */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionHeader icon={TrendingUp} title="Daily Order Fulfillment" />
          {dailyFulfillment.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyFulfillment} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="orders_fulfilled" name="Fulfilled" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="orders_created" name="Created" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart – Order status distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionHeader icon={BoxSelect} title="Order Status Distribution" />
          {statusDistribution.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="45%"
                  outerRadius={90}
                  label={({ status, percent }) =>
                    `${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {statusDistribution.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value) => <span className="text-gray-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar chart – Accuracy */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionHeader icon={Activity} title="Picking & Packing Accuracy" />
          {accuracyData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={accuracyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="picking_accuracy" name="Picking Accuracy" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="packing_accuracy" name="Packing Accuracy" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Recent Orders + Activities ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* Recent Orders */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionHeader icon={ShoppingCart} title="Recent Orders" />
          {recentOrders.length === 0 ? (
            <p className="text-gray-400 text-sm py-6 text-center">No recent orders</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order #</th>
                    <th className="text-left pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                    <th className="text-left pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
                    <th className="text-left pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentOrders.map((order) => (
                    <tr key={order.id || order.order_number} className="hover:bg-gray-50 transition">
                      <td className="py-3 font-mono font-medium text-blue-700 text-xs">
                        {order.order_number}
                      </td>
                      <td className="py-3 text-gray-700 max-w-[160px] truncate">
                        {order.customer_name || order.customer || '—'}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-3">
                        <PriorityBadge priority={order.priority} />
                      </td>
                      <td className="py-3 text-gray-500 text-xs whitespace-nowrap">
                        {order.created_at
                          ? new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Activities */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionHeader icon={Activity} title="Recent Activities" />
          {recentActivities.length === 0 ? (
            <p className="text-gray-400 text-sm py-6 text-center">No recent activities</p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {recentActivities.map((act, idx) => (
                <div key={act.id || idx} className="flex gap-3">
                  <div className="mt-0.5 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-blue-500" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-snug">{act.description || act.action || '—'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {(act.user || act.username) && (
                        <span className="text-xs text-blue-600 font-medium">{act.user || act.username}</span>
                      )}
                      {act.created_at && (
                        <span className="text-xs text-gray-400">
                          {new Date(act.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Low stock alerts ── */}
      {lowStockAlerts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionHeader icon={Boxes} title="Low Stock Alerts" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {lowStockAlerts.map((alert, idx) => (
              <div
                key={alert.id || idx}
                className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl"
              >
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {alert.product_name || alert.name || '—'}
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Stock: <strong>{alert.current_stock ?? alert.quantity ?? '—'}</strong>
                    {alert.min_stock != null && (
                      <span className="text-gray-500"> / min {alert.min_stock}</span>
                    )}
                  </p>
                  {alert.sku && (
                    <p className="text-xs text-gray-400 font-mono">{alert.sku}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
