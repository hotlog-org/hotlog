import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import z from 'zod'

import { ERoutes } from '@/config/routes'

import { useRouter } from '@/i18n/navigation'
import { signUpAction } from './sign-up.action'

export const useSignUpService = () => {
  const t = useTranslations('modules.sign-up')
  const tErrors = useTranslations('errors.auth')

  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signUpSchema = z.object({
    username: z.string().min(3, t('validation.username.min')),
    email: z.email(t('validation.email.invalid')),
    password: z.string().min(6, t('validation.password.min')),
  })

  type SignUpInputs = z.infer<typeof signUpSchema>

  const form = useForm<SignUpInputs>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: SignUpInputs) => {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await signUpAction(data, tErrors)

      if (result.success) {
        setSuccess(true)
        form.reset()
        router.push(ERoutes.DASHBOARD)
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
