import axios from 'axios'

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/api\/?$/, '').replace(/\/+$/, '')
const apiBase = rawApiUrl ? `${rawApiUrl}/api` : '/api'

const api = axios.create({
  baseURL: apiBase,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stockpilot_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally - redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('stockpilot_token')
      localStorage.removeItem('stockpilot_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  updateProfile: (data) => api.put('/auth/profile', data),
}

// Dashboard
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getCharts: () => api.get('/dashboard/charts'),
  getRecentOrders: () => api.get('/dashboard/recent-orders'),
  getRecentActivities: () => api.get('/dashboard/recent-activities'),
  getDelayedOrders: () => api.get('/dashboard/delayed-orders'),
  getLowStockAlerts: () => api.get('/dashboard/low-stock-alerts'),
}

// Orders
export const ordersAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  assignPicker: (id, data) => api.post(`/orders/${id}/assign-picker`, data),
  hold: (id, data) => api.post(`/orders/${id}/hold`, data),
  resume: (id) => api.post(`/orders/${id}/resume`),
  cancel: (id, data) => api.post(`/orders/${id}/cancel`, data),
}

// Inventory
export const inventoryAPI = {
  getProducts: (params) => api.get('/inventory/products', { params }),
  getProduct: (id) => api.get(`/inventory/products/${id}`),
  createProduct: (data) => api.post('/inventory/products', data),
  updateProduct: (id, data) => api.put(`/inventory/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/inventory/products/${id}`),
  adjustStock: (id, data) => api.post(`/inventory/products/${id}/adjust-stock`, data),
  lookupBarcode: (barcode) => api.post('/inventory/lookup-barcode', { barcode }),
  getBinLocations: () => api.get('/inventory/bin-locations'),
  createBinLocation: (data) => api.post('/inventory/bin-locations', data),
}

// Picking
export const pickingAPI = {
  getTasks: (params) => api.get('/picking/tasks', { params }),
  getTask: (id) => api.get(`/picking/tasks/${id}`),
  startTask: (id) => api.post(`/picking/tasks/${id}/start`),
  verifyBarcode: (id, data) => api.post(`/picking/tasks/${id}/verify-barcode`, data),
  confirmItem: (id, data) => api.post(`/picking/tasks/${id}/confirm-item`, data),
  reportError: (id, data) => api.post(`/picking/tasks/${id}/report-error`, data),
  completeTask: (id) => api.post(`/picking/tasks/${id}/complete`),
}

// Packing
export const packingAPI = {
  getTasks: (params) => api.get('/packing/tasks', { params }),
  getTask: (id) => api.get(`/packing/tasks/${id}`),
  startPacking: (id) => api.post(`/packing/tasks/${id}/start`),
  verifyItem: (id, data) => api.post(`/packing/tasks/${id}/verify-item`, data),
  updateChecklist: (id, data) => api.put(`/packing/tasks/${id}/checklist`, data),
  reportError: (id, data) => api.post(`/packing/tasks/${id}/report-error`, data),
  complete: (id, data) => api.post(`/packing/tasks/${id}/complete`, data),
}

// Dispatch
export const dispatchAPI = {
  getQueue: (params) => api.get('/dispatch', { params }),
  confirmDispatch: (data) => api.post('/dispatch/confirm', data),
  getSummary: (orderId) => api.get(`/dispatch/summary/${orderId}`),
  markDelivered: (orderId) => api.post(`/dispatch/${orderId}/deliver`),
}

// Analytics
export const analyticsAPI = {
  getSummary: (params) => api.get('/analytics/summary', { params }),
  exportCsv: (type) => `${apiBase}/analytics/export/${type}`,
}

// Users
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getRoles: () => api.get('/users/roles'),
  getStaffByRole: (role) => api.get(`/users/staff/${role}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
}

// Activity
export const activityAPI = {
  getLogs: (params) => api.get('/activity/logs', { params }),
  getErrors: (params) => api.get('/activity/errors', { params }),
  resolveError: (id, data) => api.post(`/activity/errors/${id}/resolve`, data),
}

export default api
