'use server'

import { authClient } from '@/lib/better-auth/client'
import { ErrorCode, mapErrorToCode } from '@/shared/utils'
import { getTranslations } from 'next-intl/server'

export interface LoginData {
  email: string
  password: string
}

export interface LoginResult {
  success: boolean
  error?: string
  errorCode?: ErrorCode
}

export const loginAction = async (data: LoginData): Promise<LoginResult> => {
  const t = await getTranslations('errors.login')

  try {
    const result = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    })

    if (result.error) {
      const errorCode = mapErrorToCode(result.error)
      return {
        success: false,
        error: t(errorCode) || t(ErrorCode.INVALID_EMAIL_OR_PASSWORD),
        errorCode,
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    const errorCode = mapErrorToCode(error)

    return {
      success: false,
      error: t(errorCode) || t(ErrorCode.INVALID_EMAIL_OR_PASSWORD),
      errorCode,
    }
  }
}
