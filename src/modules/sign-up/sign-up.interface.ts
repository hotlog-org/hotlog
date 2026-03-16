export interface SignUpData {
  email: string
  password: string
}

export interface SignUpResult {
  success: boolean
  errorCode?: string
}
