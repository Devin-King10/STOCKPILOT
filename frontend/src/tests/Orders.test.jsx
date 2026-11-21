import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OrdersPage from '../pages/OrdersPage'
import { ToastProvider } from '../context/ToastContext'
import { ordersAPI, usersAPI } from '../services/api'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, full_name: 'Marcus Vance', role: 'manager' },
    isManager: () => true,
  }),
}))

vi.mock('../services/api', () => ({
  ordersAPI: {
    getAll: vi.fn(),
    create: vi.fn(),
  },
  usersAPI: {
    getStaffByRole: vi.fn(),
  },
  inventoryAPI: {
    getProducts: vi.fn().mockResolvedValue({ data: { products: [] } }),
  },
}))

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ordersAPI.getAll.mockResolvedValue({
      data: {
        total: 1,
        orders: [
          {
            id: 1,
            order_number: 'ORD-2026-1001',
            customer_name: 'Alpha Corp Logistics',
            customer_email: 'procurement@alphacorp.com',
            priority: 'HIGH',
            status: 'Ready for Dispatch',
            total_items: 3,
            total_amount: 419.48,
            assigned_picker_name: 'Paul Rivera',
            created_at: '2026-11-20T10:00:00Z',
          },
        ],
      },
    })
    usersAPI.getStaffByRole.mockResolvedValue({ data: { users: [] } })
  })

  it('renders orders management view and orders table', async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <OrdersPage />
        </ToastProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/ORD-2026-1001/i)).toBeInTheDocument()
      expect(screen.getByText(/Alpha Corp Logistics/i)).toBeInTheDocument()
    })
  })
})
