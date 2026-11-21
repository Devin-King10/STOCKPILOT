import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DispatchPage from '../pages/DispatchPage'
import { ToastProvider } from '../context/ToastContext'
import { dispatchAPI } from '../services/api'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 4, full_name: 'David Chen', role: 'dispatch' },
    isManager: () => false,
  }),
}))

vi.mock('../services/api', () => ({
  dispatchAPI: {
    getQueue: vi.fn(),
  },
}))

describe('DispatchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dispatchAPI.getQueue.mockResolvedValue({
      data: {
        total: 1,
        orders: [
          {
            id: 3,
            order_number: 'ORD-2026-1003',
            customer_name: 'Horizon Retailers Ltd',
            priority: 'HIGH',
            status: 'Ready for Dispatch',
            total_items: 7,
            total_amount: 379.93,
            shipping_address: '884 Broadway Ave, New York',
            packed_at: '2026-11-20T16:00:00Z',
          },
        ],
      },
    })
  })

  it('renders dispatch staging queue with ready orders', async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <DispatchPage />
        </ToastProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/ORD-2026-1003/i)).toBeInTheDocument()
      expect(screen.getByText(/Horizon Retailers Ltd/i)).toBeInTheDocument()
    })
  })
})
