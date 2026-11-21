import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PackingPage from '../pages/PackingPage'
import { ToastProvider } from '../context/ToastContext'
import { packingAPI } from '../services/api'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 3, full_name: 'Sarah Jenkins', role: 'packer' },
    isManager: () => false,
  }),
}))

vi.mock('../services/api', () => ({
  packingAPI: {
    getTasks: vi.fn(),
  },
}))

describe('PackingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    packingAPI.getTasks.mockResolvedValue({
      data: {
        total: 1,
        tasks: [
          {
            id: 1,
            order_id: 5,
            order_number: 'ORD-2026-1005',
            customer_name: 'Quantum Media Works',
            packer_name: 'Sarah Jenkins',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            items: [
              { id: 1, product_name: 'Apex Pro Headset', ordered_qty: 1, verified_qty: 1, status: 'VERIFIED' }
            ],
            checklist: { qty_verified: true },
            created_at: '2026-11-20T10:00:00Z',
          },
        ],
      },
    })
  })

  it('renders packing dashboard and orders awaiting packing', async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <PackingPage />
        </ToastProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/ORD-2026-1005/i)).toBeInTheDocument()
      expect(screen.getByText(/Quantum Media Works/i)).toBeInTheDocument()
    })
  })
})
