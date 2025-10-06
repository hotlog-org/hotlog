export enum ErrorCode {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  FAILED_TO_CREATE_USER = 'FAILED_TO_CREATE_USER',
  FAILED_TO_CREATE_SESSION = 'FAILED_TO_CREATE_SESSION',
  FAILED_TO_UPDATE_USER = 'FAILED_TO_UPDATE_USER',
  FAILED_TO_GET_SESSION = 'FAILED_TO_GET_SESSION',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_EMAIL_OR_PASSWORD = 'INVALID_EMAIL_OR_PASSWORD',
  SOCIAL_ACCOUNT_ALREADY_LINKED = 'SOCIAL_ACCOUNT_ALREADY_LINKED',
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  INVALID_TOKEN = 'INVALID_TOKEN',
  ID_TOKEN_NOT_SUPPORTED = 'ID_TOKEN_NOT_SUPPORTED',
  FAILED_TO_GET_USER_INFO = 'FAILED_TO_GET_USER_INFO',
  USER_EMAIL_NOT_FOUND = 'USER_EMAIL_NOT_FOUND',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  PASSWORD_TOO_SHORT = 'PASSWORD_TOO_SHORT',
  PASSWORD_TOO_LONG = 'PASSWORD_TOO_LONG',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  EMAIL_CAN_NOT_BE_UPDATED = 'EMAIL_CAN_NOT_BE_UPDATED',
  CREDENTIAL_ACCOUNT_NOT_FOUND = 'CREDENTIAL_ACCOUNT_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  FAILED_TO_UNLINK_LAST_ACCOUNT = 'FAILED_TO_UNLINK_LAST_ACCOUNT',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  USER_ALREADY_HAS_PASSWORD = 'USER_ALREADY_HAS_PASSWORD',
  SOMETHING_WENT_WRONG = 'SOMETHING_WENT_WRONG',
}

export const mapErrorToCode = (error: unknown): ErrorCode => {
  if (!error) return ErrorCode.FAILED_TO_CREATE_USER

  const errorObj = error as {
    message?: string
    code?: string
  }

  const message = errorObj.message?.toLowerCase() || ''
  const code = errorObj.code?.toUpperCase() || ''

  if (code in ErrorCode) {
    return ErrorCode[code as keyof typeof ErrorCode]
  }

  if (
    message.includes('user already exists') ||
    message.includes('duplicate')
  ) {
    return ErrorCode.USER_ALREADY_EXISTS
  }

  if (message.includes('invalid email')) {
    return ErrorCode.INVALID_EMAIL
  }

  if (
    message.includes('password too short') ||
    message.includes('password must be at least')
  ) {
    return ErrorCode.PASSWORD_TOO_SHORT
  }

  if (message.includes('password too long')) {
    return ErrorCode.PASSWORD_TOO_LONG
  }

  if (message.includes('invalid password')) {
    return ErrorCode.INVALID_PASSWORD
  }

  if (message.includes('user not found')) {
    return ErrorCode.USER_NOT_FOUND
  }

  if (message.includes('email not verified')) {
    return ErrorCode.EMAIL_NOT_VERIFIED
  }

  if (message.includes('invalid token')) {
    return ErrorCode.INVALID_TOKEN
  }

  if (message.includes('session expired')) {
    return ErrorCode.SESSION_EXPIRED
  }

  if (message.includes('failed to create session')) {
    return ErrorCode.FAILED_TO_CREATE_SESSION
  }

  if (message.includes('failed to get session')) {
    return ErrorCode.FAILED_TO_GET_SESSION
  }

  return ErrorCode.FAILED_TO_CREATE_USER
}
