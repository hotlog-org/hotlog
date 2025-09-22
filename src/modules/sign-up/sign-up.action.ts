'use client'

import { authClient } from '@/lib/better-auth'
import { ErrorCode, mapErrorToCode } from '@/shared/utils'

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

export const signUpAction = async (
  data: SignUpData,
  t: (key: string) => string,
): Promise<SignUpResult> => {
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
