'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { mapErrorToCode } from '@/shared/utils'

import { type SignUpData, type SignUpResult } from './sign-up.interface'

export const signUpAction = async (data: SignUpData): Promise<SignUpResult> => {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

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
