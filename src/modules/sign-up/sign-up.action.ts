'use server'

import { authClient } from '@/lib/better-auth/client'
import { ErrorCode, mapErrorToCode } from '@/shared/utils'
import { getTranslations } from 'next-intl/server'

export interface SignUpData {
  username: string
  email: string
  password: string
}

export interface SignUpResult {
  success: boolean
  error?: string
  errorCode?: ErrorCode
}

export const signUpAction = async (data: SignUpData): Promise<SignUpResult> => {
  const t = await getTranslations('errors.signup')

  try {
    const result = await authClient.signUp.email({
      name: data.username,
      email: data.email,
      password: data.password,
    })

    if (result.error) {
      const errorCode = mapErrorToCode(result.error)
      return {
        success: false,
        error: t(errorCode) || t(ErrorCode.FAILED_TO_CREATE_USER),
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
      error: t(errorCode) || t(ErrorCode.FAILED_TO_CREATE_USER),
      errorCode,
    }
  }
}
