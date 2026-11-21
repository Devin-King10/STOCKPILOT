import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PickingPage from '../pages/PickingPage'
import { ToastProvider } from '../context/ToastContext'
import { pickingAPI, usersAPI } from '../services/api'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 2, full_name: 'Paul Rivera', role: 'picker' },
    isManager: () => false,
  }),
}))

vi.mock('../services/api', () => ({
  pickingAPI: {
    getTasks: vi.fn(),
  },
  usersAPI: {
    getStaffByRole: vi.fn(),
  },
}))

describe('PickingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pickingAPI.getTasks.mockResolvedValue({
      data: {
        total: 1,
        tasks: [
          {
            id: 1,
            task_number: 'PICK-ORD-2026-1008',
            order_number: 'ORD-2026-1008',
            customer_name: 'Sierra Ceramic Crafts',
            picker_name: 'Paul Rivera',
            priority: 'NORMAL',
            status: 'PENDING',
            total_items: 3,
            picked_items: 0,
            progress_percentage: 0,
            created_at: '2026-11-20T12:00:00Z',
          },
        ],
      },
    })
    usersAPI.getStaffByRole.mockResolvedValue({ data: { users: [] } })
  })

  it('renders assigned picking tasks list', async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <PickingPage />
        </ToastProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/PICK-ORD-2026-1008/i)).toBeInTheDocument()
      expect(screen.getByText(/Sierra Ceramic Crafts/i)).toBeInTheDocument()
    })
  })
})
