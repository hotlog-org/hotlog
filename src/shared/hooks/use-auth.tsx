'use client'

import { createClient } from '@/lib/supabase/client'
import type { Session, User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

interface AuthUser {
  id: string
  email: string | null
  name?: string
  createdAt: Date | null
  updatedAt: Date | null
}

interface AuthState {
  user: AuthUser | null
  session: Session | null
  isLoading: boolean
  isLogged: boolean
}

const toDate = (value?: string) => (value ? new Date(value) : null)

const mapUser = (user: User | null): AuthUser | null => {
  if (!user) {
    return null
  }

  return {
    id: user.id,
    email: user.email ?? null,
    name:
      user.user_metadata?.username ??
      user.user_metadata?.name ??
      user.email?.split('@')[0],
    createdAt: toDate(user.created_at),
    updatedAt: toDate(user.updated_at),
  }
}

export function useAuth() {
  const [supabase] = useState(createClient)
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isLogged: false,
  })

  useEffect(() => {
    let isMounted = true

    const syncAuthState = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      setAuthState({
        user: mapUser(session?.user ?? null),
        session,
        isLoading: false,
        isLogged: !!session?.user,
      })
    }

    void syncAuthState()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return
      }

      setAuthState({
        user: mapUser(session?.user ?? null),
        session,
        isLoading: false,
        isLogged: !!session?.user,
      })
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  return authState
}
