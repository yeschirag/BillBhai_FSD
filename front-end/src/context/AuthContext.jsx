import { useMemo, useState } from 'react'
import {
  authenticateUser,
  clearSession,
  getStoredCurrentUser,
} from '../services/authService.js'
import { AuthContext } from './AuthContextValue.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredCurrentUser())

  const signIn = async (identity, password) => {
    const result = await authenticateUser(identity, password)
    if (!result.ok) return result

    setUser(result.user)
    return result
  }

  const signOut = () => {
    clearSession()
    setUser(null)
  }

  const value = useMemo(
    () => ({
      user,
      signIn,
      signOut,
      isAuthenticated: Boolean(user),
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
