import { IconSvgElement } from '@hugeicons/react'

export type LoginProvider = 'google' | 'github' | 'discord'

export interface LoginData {
  email: string
  password: string
}

export interface LoginResult {
  success: boolean
  errorCode?: string
}

export interface SocialLoginResult {
  success: boolean
  url?: string
  errorCode?: string
}

export interface LoginProviderOption {
  id: LoginProvider
  icon: IconSvgElement
  color: string
}
