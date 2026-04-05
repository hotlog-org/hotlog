import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import z from 'zod'

import { ERoutes } from '@/config/routes'

import { useRouter } from '@/i18n/navigation'
import { signUpAction } from './sign-up.action'
import { type SignUpData } from './sign-up.interface'

export const useSignUpService = () => {
  const t = useTranslations('modules.sign-up')
  const tErrors = useTranslations('errors.auth')

  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signUpSchema = z.object({
    email: z.email(t('validation.email.invalid')),
    password: z.string().min(6, t('validation.password.min')),
  })

  const form = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: SignUpData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await signUpAction(data)

      if (result.success) {
        setSuccess(true)
        form.reset()
        router.push(ERoutes.DASHBOARD)
      } else {
        setError(
          result.errorCode
            ? tErrors(result.errorCode as never)
            : t('messages.error'),
        )
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
