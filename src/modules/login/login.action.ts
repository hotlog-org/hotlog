import { authClient } from '@/lib/better-auth'
import { ErrorCode, mapErrorToCode } from '@/shared/utils'

export interface LoginData {
  email: string
  password: string
}

export interface LoginResult {
  success: boolean
  error?: string
}

export const loginAction = async (
  data: LoginData,
  t: (key: string) => string,
): Promise<LoginResult> => {
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
    }
  }
}
