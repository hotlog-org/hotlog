import { zodResolver } from '@hookform/resolvers/zod'
import { useLocale, useTranslations } from 'next-intl'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import z from 'zod'

import { createClient } from '@/lib/supabase/client'

export const useForgotPasswordService = () => {
  const t = useTranslations('modules.forgot-password')
  const locale = useLocale()
  const pending = useRef(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const schema = z.object({ email: z.email(t('invalidEmail')) })
  type Inputs = z.infer<typeof schema>
  const form = useForm<Inputs>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: Inputs) => {
    if (pending.current) return
    pending.current = true
    setIsLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const redirectTo = new URL(
        `/${locale}/auth/callback`,
        window.location.origin,
      )
      redirectTo.searchParams.set('recovery', '1')
      const { error } = await createClient().auth.resetPasswordForEmail(
        data.email,
        {
          redirectTo: redirectTo.toString(),
        },
      )
      if (error) throw error
      setSuccess(true)
      form.reset()
    } catch {
      setError(t('error'))
    } finally {
      pending.current = false
      setIsLoading(false)
    }
  }

  return { t, form, onSubmit, isLoading, success, error }
}
