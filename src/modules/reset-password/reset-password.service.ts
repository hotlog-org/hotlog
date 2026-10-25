import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import z from 'zod'

import { ERoutes } from '@/config/routes'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'

export const useResetPasswordService = () => {
  const t = useTranslations('modules.reset-password')
  const tSignUp = useTranslations('modules.sign-up')
  const router = useRouter()
  const pending = useRef(false)
  const [isChecking, setIsChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [passwordUpdated, setPasswordUpdated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const schema = z
    .object({
      // Keep the existing sign-up password policy (six characters).
      password: z.string().min(6, tSignUp('validation.password.min')),
      confirmation: z.string(),
    })
    .refine((data) => data.password === data.confirmation, {
      message: t('mismatch'),
      path: ['confirmation'],
    })
  type Inputs = z.infer<typeof schema>
  const form = useForm<Inputs>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmation: '' },
  })

  useEffect(() => {
    let active = true
    async function checkSession() {
      try {
        const { data, error } = await createClient().auth.getUser()
        if (active) {
          setHasSession(!error && Boolean(data.user))
          if (error || !data.user) setError(t('invalid'))
        }
      } catch {
        if (active) setError(t('invalid'))
      } finally {
        if (active) setIsChecking(false)
      }
    }
    void checkSession()
    return () => {
      active = false
    }
  }, [t])

  const finishSignOut = async () => {
    const { error } = await createClient().auth.signOut()
    if (error) throw error
    router.replace(`${ERoutes.SIGN_IN}?recovery=complete`)
    router.refresh()
  }

  const onSubmit = async (data: Inputs) => {
    if (pending.current || !hasSession || passwordUpdated) return
    pending.current = true
    setIsLoading(true)
    setError(null)
    try {
      const { error } = await createClient().auth.updateUser({
        password: data.password,
      })
      if (error) {
        setError(t('error'))
        return
      }
      setPasswordUpdated(true)
      form.reset()
      try {
        await finishSignOut()
      } catch {
        setError(t('signOutError'))
      }
    } catch {
      setError(t('error'))
    } finally {
      pending.current = false
      setIsLoading(false)
    }
  }

  const retrySignOut = async () => {
    if (pending.current || !passwordUpdated) return
    pending.current = true
    setIsLoading(true)
    setError(null)
    try {
      await finishSignOut()
    } catch {
      setError(t('signOutError'))
    } finally {
      pending.current = false
      setIsLoading(false)
    }
  }

  return {
    t,
    form,
    onSubmit,
    retrySignOut,
    isChecking,
    hasSession,
    isLoading,
    passwordUpdated,
    error,
  }
}
