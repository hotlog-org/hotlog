'use client'

import { createContext } from 'react'
import { authClient } from './client'

interface User {
  id: string
  email: string
  name?: string
  createdAt: Date
  updatedAt: Date
}

interface Session {
  id: string
  userId: string
  expiresAt: Date
  token: string
}

interface AuthContextValue {
  user: User | null
  session: Session | null
  isLoading: boolean
  isLogged: boolean
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: sessionData, isPending } = authClient.useSession()

  const value: AuthContextValue = {
    user: sessionData?.user ?? null,
    session: sessionData?.session ?? null,
    isLoading: isPending,
    isLogged: !!(sessionData?.user && sessionData?.session),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
