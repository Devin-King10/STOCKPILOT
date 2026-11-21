import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import MainLayout from './layouts/MainLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import InventoryPage from './pages/InventoryPage'
import BinLocationsPage from './pages/BinLocationsPage'
import PickingPage from './pages/PickingPage'
import PickingTaskPage from './pages/PickingTaskPage'
import PackingPage from './pages/PackingPage'
import PackingTaskPage from './pages/PackingTaskPage'
import DispatchPage from './pages/DispatchPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ActivityLogsPage from './pages/ActivityLogsPage'
import UsersPage from './pages/UsersPage'
import SettingsPage from './pages/SettingsPage'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== 'manager') {
    return <Navigate to="/" replace />
  }
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="bin-locations" element={<BinLocationsPage />} />
        <Route path="picking" element={<PickingPage />} />
        <Route path="picking/:id" element={<PickingTaskPage />} />
        <Route path="packing" element={<PackingPage />} />
        <Route path="packing/:id" element={<PackingTaskPage />} />
        <Route path="dispatch" element={<DispatchPage />} />
        <Route path="analytics" element={<ProtectedRoute allowedRoles={['manager']}><AnalyticsPage /></ProtectedRoute>} />
        <Route path="activity" element={<ActivityLogsPage />} />
        <Route path="activity-logs" element={<ActivityLogsPage />} />
        <Route path="users" element={<ProtectedRoute allowedRoles={['manager']}><UsersPage /></ProtectedRoute>} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
