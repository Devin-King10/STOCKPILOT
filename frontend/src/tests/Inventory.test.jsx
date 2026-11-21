import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import InventoryPage from '../pages/InventoryPage'
import { inventoryAPI } from '../services/api'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, full_name: 'Marcus Vance', role: 'manager' },
    isManager: () => true,
  }),
}))

vi.mock('../services/api', () => ({
  inventoryAPI: {
    getProducts: vi.fn(),
    getBinLocations: vi.fn(),
    lookupBarcode: vi.fn(),
  },
}))

describe('InventoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    inventoryAPI.getProducts.mockResolvedValue({
      data: {
        total: 1,
        categories: ['Electronics'],
        products: [
          {
            id: 1,
            name: 'Apex Pro Wireless Gaming Headset',
            sku: 'EL-HD-001',
            barcode: '890123400101',
            category: 'Electronics',
            available_qty: 85,
            reserved_qty: 15,
            total_qty: 100,
            min_stock_level: 20,
            unit_price: 149.99,
            bin_location: 'A-01-01',
            status: 'ACTIVE',
            is_low_stock: false,
          },
        ],
      },
    })
    inventoryAPI.getBinLocations.mockResolvedValue({ data: { bin_locations: [{ id: 1, code: 'A-01-01' }] } })
  })

  it('renders products table and product details', async () => {
    render(
      <MemoryRouter>
        <InventoryPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Apex Pro Wireless Gaming Headset/i)).toBeInTheDocument()
      expect(screen.getByText(/EL-HD-001/i)).toBeInTheDocument()
    })
  })
})
