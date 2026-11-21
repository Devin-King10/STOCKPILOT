import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, User, Lock, Eye, EyeOff, LogIn, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const DEMO_ACCOUNTS = [
  { label: 'Manager', username: 'manager', password: 'Manager@123', color: 'bg-blue-600 hover:bg-blue-700', role: 'Full Access' },
  { label: 'Picker', username: 'picker', password: 'Picker@123', color: 'bg-emerald-600 hover:bg-emerald-700', role: 'Picking Tasks' },
  { label: 'Packer', username: 'packer', password: 'Packer@123', color: 'bg-orange-600 hover:bg-orange-700', role: 'Packing Tasks' },
  { label: 'Dispatch', username: 'dispatch', password: 'Dispatch@123', color: 'bg-purple-600 hover:bg-purple-700', role: 'Dispatch Queue' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleQuickFill = (account) => {
    setForm({ username: account.username, password: account.password })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username.trim() || !form.password.trim()) {
      setError('Please enter both username and password.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await login({ username: form.username.trim(), password: form.password })
      navigate('/', { replace: true })
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Invalid username or password. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0f2444 0%, #1e3a5f 40%, #0d3060 70%, #0a1f3d 100%)',
      }}
    >
      {/* Background decorative circles */}
      <div
        className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', transform: 'translate(-40%, -40%)' }}
      />
      <div
        className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', transform: 'translate(40%, 40%)' }}
      />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div
          className="rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}
        >
          {/* Header */}
          <div
            className="px-8 py-8 text-center"
            style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' }}
          >
            <div className="flex justify-center mb-3">
              <div className="bg-white bg-opacity-20 rounded-2xl p-3 inline-flex">
                <Package className="w-10 h-10 text-white" strokeWidth={1.5} />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">StockPilot</h1>
            <p className="text-blue-200 mt-1 text-sm font-medium">Warehouse Management System</p>
          </div>

          {/* Form Body */}
          <div className="px-8 py-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">Sign in to your account</h2>

            {/* Error banner */}
            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <User className="w-5 h-5" />
                  </span>
                  <input
                    id="username"
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    autoComplete="username"
                    placeholder="Enter your username"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-11 py-3 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ background: loading ? '#6b7280' : 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Quick Fill Demo Accounts */}
            <div className="mt-7">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Demo Accounts — click to fill</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => handleQuickFill(acc)}
                    disabled={loading}
                    className={`${acc.color} text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors duration-150 disabled:opacity-50`}
                  >
                    <div className="font-semibold">{acc.label}</div>
                    <div className="opacity-80 text-xs">{acc.role}</div>
                  </button>
                ))}
              </div>
              <p className="text-center text-xs text-gray-400 mt-3">
                All demo accounts use role-name + <code className="bg-gray-100 px-1 rounded">@123</code> pattern
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-300 text-xs mt-5 opacity-70">
          © {new Date().getFullYear()} StockPilot · Warehouse Management System
        </p>
      </div>
    </div>
  )
}
