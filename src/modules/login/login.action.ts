'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

import { ERoutes } from '@/config/routes'
import { createClient } from '@/lib/supabase/server'
import { mapErrorToCode } from '@/shared/utils'

import {
  type LoginData,
  type LoginProvider,
  type LoginResult,
  type SocialLoginResult,
} from './login.interface'

export const loginAction = async (data: LoginData): Promise<LoginResult> => {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
      const errorCode = mapErrorToCode(error)

      return {
        success: false,
        errorCode,
      }
    }

    revalidatePath('/', 'layout')

    return {
      success: true,
    }
  } catch (error) {
    const errorCode = mapErrorToCode(error)

    return {
      success: false,
      errorCode,
    }
  }
}

const getOrigin = async () => {
  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host')
  const protocol = headerStore.get('x-forwarded-proto') ?? 'http'

  if (!host) {
    throw new Error('Missing host header')
  }

  return `${protocol}://${host}`
}

export const socialLoginAction = async (
  provider: LoginProvider,
  locale: string,
): Promise<SocialLoginResult> => {
  try {
    const supabase = await createClient()
    const origin = await getOrigin()
    const nextPath = `/${locale}${ERoutes.DASHBOARD}`
    const redirectTo = `${origin}/${locale}/auth/callback?next=${encodeURIComponent(nextPath)}`
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    })

    if (error || !data.url) {
      const errorCode = error ? mapErrorToCode(error) : 'SOMETHING_WENT_WRONG'

      return {
        success: false,
        errorCode,
      }
    }

    return {
      success: true,
      url: data.url,
    }
  } catch (error) {
    const errorCode = mapErrorToCode(error)

    return {
      success: false,
      errorCode,
    }
  }
}
