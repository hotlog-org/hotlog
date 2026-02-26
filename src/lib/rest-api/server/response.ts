import { NextResponse } from 'next/server'

export const ApiErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode]

export interface ApiErrorPayload {
  code: ApiErrorCode
  message?: string
  details?: unknown
}

export interface ApiResponseSuccess<T> {
  success: true
  data: T
}

export interface ApiResponseError {
  success: false
  error: ApiErrorPayload
}

export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError

type ApiErrorInit = {
  code: ApiErrorCode
  message?: string
  details?: unknown
  status?: number
}

export const buildApiSuccess = <T>(
  data: T,
  init?: { status?: number },
): NextResponse<ApiResponse<T>> => {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status: init?.status ?? 200 },
  )
}

export const buildApiError = (
  payload: ApiErrorInit,
): NextResponse<ApiResponseError> => {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: payload.code,
        message: payload.message,
        details: payload.details,
      },
    },
    { status: payload.status ?? 400 },
  )
}

export const isApiSuccess = <T>(
  value: ApiResponse<T>,
): value is ApiResponseSuccess<T> => value.success
