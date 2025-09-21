import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import z from 'zod'

import { loginAction } from './login.action'

export const useLoginService = () => {
  const t = useTranslations('modules.login')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loginSchema = z.object({
    email: z.string().email(t('validation.email.invalid')),
    password: z.string().min(1, t('validation.password.required')),
  })

  type LoginInputs = z.infer<typeof loginSchema>

  const form = useForm<LoginInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginInputs) => {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await loginAction(data)

      if (result.success) {
        setSuccess(true)
        form.reset()
      } else {
        setError(result.error || t('messages.error'))
      }
    } catch {
      setError(t('messages.error'))
    } finally {
      setIsLoading(false)
    }
  }

  return {
    t,
    form,
    onSubmit,
    isLoading,
    error,
    success,
  }
}
