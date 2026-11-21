import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'

// ── Mocks ─────────────────────────────────────────────────
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn().mockResolvedValue(undefined),
    user: null,
  }),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

// ── Helpers ───────────────────────────────────────────────
const renderLogin = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )

// ── Tests ─────────────────────────────────────────────────
describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the StockPilot brand heading', () => {
    renderLogin()
    expect(screen.getByRole('heading', { name: /stockpilot/i })).toBeInTheDocument()
  })

  it('renders username and password inputs', () => {
    renderLogin()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders the login submit button', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders quick-fill demo credential buttons', () => {
    renderLogin()
    // All four role quick-fill buttons should be visible
    expect(screen.getByRole('button', { name: /manager/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /picker/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /packer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dispatch/i })).toBeInTheDocument()
  })

  it('fills username and password when a demo button is clicked', async () => {
    renderLogin()
    const managerBtn = screen.getByRole('button', { name: /manager/i })
    fireEvent.click(managerBtn)
    const usernameInput = screen.getByLabelText(/username/i)
    await waitFor(() => {
      expect(usernameInput.value).toBe('manager')
    })
  })

  it('shows validation error when submitted with empty fields', async () => {
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(screen.getByText(/please enter both username and password/i)).toBeInTheDocument()
    })
  })
})
