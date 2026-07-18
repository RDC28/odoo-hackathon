import { createContext, useContext, useState } from 'react'
import * as api from '../api/api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => api.currentUser())

  const refresh = () => setUser(api.currentUser())
  const login = async (email, password) => { const u = await api.login(email, password); setUser(u); return u }
  const logout = () => { api.logout(); setUser(null) }

  return <AuthCtx.Provider value={{ user, refresh, login, logout }}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
