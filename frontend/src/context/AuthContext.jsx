import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('stockpilot_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('stockpilot_token')
    if (!token) { setLoading(false); return }
    try {
      const res = await authAPI.me()
      const fetchedUser = res.data.user
      setUser(fetchedUser)
      localStorage.setItem('stockpilot_user', JSON.stringify(fetchedUser))
    } catch {
      localStorage.removeItem('stockpilot_token')
      localStorage.removeItem('stockpilot_user')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMe() }, [fetchMe])

  const login = async (credentials) => {
    const res = await authAPI.login(credentials)
    const { token, user: loggedInUser } = res.data
    localStorage.setItem('stockpilot_token', token)
    localStorage.setItem('stockpilot_user', JSON.stringify(loggedInUser))
    setUser(loggedInUser)
    return loggedInUser
  }

  const logout = () => {
    localStorage.removeItem('stockpilot_token')
    localStorage.removeItem('stockpilot_user')
    setUser(null)
  }

  const hasRole = (...roles) => user && roles.includes(user.role)
  const isManager = () => user?.role === 'manager'

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, isManager, fetchMe }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
