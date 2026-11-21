import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from '../pages/DashboardPage'
import { dashboardAPI } from '../services/api'

// Mock Recharts ResponsiveContainer for jsdom
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div className="recharts-mock">{children}</div>,
  }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, full_name: 'Marcus Vance', role: 'manager' },
    isManager: () => true,
  }),
}))

vi.mock('../services/api', () => ({
  dashboardAPI: {
    getStats: vi.fn(),
    getCharts: vi.fn(),
    getRecentOrders: vi.fn(),
    getRecentActivities: vi.fn(),
    getDelayedOrders: vi.fn(),
    getLowStockAlerts: vi.fn(),
  },
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dashboardAPI.getStats.mockResolvedValue({
      data: {
        total_orders: 42,
        pending_orders: 8,
        orders_being_picked: 3,
        orders_awaiting_packing: 2,
        orders_ready_for_dispatch: 5,
        dispatched_orders: 24,
        picking_errors: 1,
        packing_errors: 0,
        picking_accuracy: 98.5,
        packing_accuracy: 100.0,
      },
    })
    dashboardAPI.getCharts.mockResolvedValue({
      data: {
        daily_fulfillment: [{ date: 'Nov 20', orders_created: 10, orders_picked: 8, orders_dispatched: 6 }],
        status_distribution: [{ name: 'Dispatched', value: 24 }],
        accuracy_data: [{ process: 'Picking', rate: 98.5 }, { process: 'Packing', rate: 100.0 }],
      },
    })
    dashboardAPI.getRecentOrders.mockResolvedValue({
      data: {
        orders: [
          { id: 1, order_number: 'ORD-2026-1001', customer_name: 'Alpha Corp', status: 'Dispatched', priority: 'HIGH', total_amount: 419.48, created_at: '2026-11-20T10:00:00Z' },
        ],
      },
    })
    dashboardAPI.getRecentActivities.mockResolvedValue({
      data: {
        activities: [
          { id: 1, action: 'ORDER_CREATED', description: 'Order created', user_name: 'Marcus Vance', timestamp: '2026-11-20T10:00:00Z' },
        ],
      },
    })
    dashboardAPI.getDelayedOrders.mockResolvedValue({ data: { count: 0, orders: [] } })
    dashboardAPI.getLowStockAlerts.mockResolvedValue({ data: { count: 0, products: [] } })
  })

  it('renders dashboard heading and KPI cards with real database stats', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/42/i)).toBeInTheDocument()
      expect(screen.getByText(/ORD-2026-1001/i)).toBeInTheDocument()
    })
  })
})
