import { zodResolver } from '@hookform/resolvers/zod'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import z from 'zod'

import { loginAction, socialLoginAction } from './login.action'
import {
  type LoginData,
  type LoginProvider,
  type LoginProviderOption,
} from './login.interface'

import { ERoutes } from '@/config/routes'
import { useRouter } from '@/i18n/navigation'
import { DiscordIcon, GithubIcon, GoogleIcon } from '@hugeicons/core-free-icons'

const loginProviders: LoginProviderOption[] = [
  {
    id: 'google',
    icon: GoogleIcon,
    color: 'text-red-500',
  },
  {
    id: 'github',
    icon: GithubIcon,
    color: 'text-white',
  },
  {
    id: 'discord',
    icon: DiscordIcon,
    color: 'text-indigo-500',
  },
]

export const useLoginService = () => {
  const t = useTranslations('modules.login')
  const tErrors = useTranslations('errors.auth')
  const locale = useLocale()

  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loginSchema = z.object({
    email: z.email(t('validation.email.invalid')),
    password: z.string().min(1, t('validation.password.required')),
  })

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginData) => {
    setIsLoading(true)
    setSuccess(false)
    setError(null)

    try {
      const result = await loginAction(data)

      if (result.success) {
        router.push(ERoutes.DASHBOARD)
        setSuccess(true)
        setError(null)
        form.reset()
      } else {
        setError(
          result.errorCode
            ? tErrors(result.errorCode as never)
            : t('messages.error'),
        )
        setSuccess(false)
      }
    } catch {
      setError(t('messages.error'))
      setSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProviderSignIn = async (provider: LoginProvider) => {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await socialLoginAction(provider, locale)

      if (!result.success || !result.url) {
        setError(
          result.errorCode
            ? tErrors(result.errorCode as never)
            : t('messages.error'),
        )
        return
      }

      window.location.assign(result.url)
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
    handleProviderSignIn,
    providers: loginProviders,
    isLoading,
    error,
    success,
  }
}
