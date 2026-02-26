import { NextResponse } from 'next/server'

import { envServer } from '@/config/env'
import { ApiErrorCode, buildApiError } from './response'

interface ProxyToGoApiParams {
  request: Request
  userId: string
  path: string
}

const withTrailingSlash = (value: string) =>
  value.endsWith('/') ? value : `${value}/`

export const proxyToGoApi = async ({
  request,
  userId,
  path,
}: ProxyToGoApiParams): Promise<NextResponse> => {
  const requestUrl = new URL(request.url)
  const targetUrl = new URL(
    path.replace(/^\//, ''),
    withTrailingSlash(envServer.GO_API_BASE_URL),
  )
  targetUrl.search = requestUrl.search

  const headers = new Headers()
  headers.set('x-user-id', userId)
  headers.set('x-internal-token', envServer.GO_API_INTERNAL_TOKEN)

  const contentType = request.headers.get('content-type')
  if (contentType) {
    headers.set('content-type', contentType)
  }

  const method = request.method.toUpperCase()

  try {
    const body =
      method === 'GET' || method === 'HEAD' ? undefined : await request.text()

    const proxyResponse = await fetch(targetUrl.toString(), {
      method,
      headers,
      body: body && body.length > 0 ? body : undefined,
      cache: 'no-store',
    })

    const responseBody = await proxyResponse.text()
    const responseHeaders = new Headers()
    const responseContentType = proxyResponse.headers.get('content-type')

    if (responseContentType) {
      responseHeaders.set('content-type', responseContentType)
    }

    return new NextResponse(responseBody, {
      status: proxyResponse.status,
      headers: responseHeaders,
    })
  } catch {
    return buildApiError({
      code: ApiErrorCode.INTERNAL_ERROR,
      status: 500,
      message: 'Go backend is unavailable',
    })
  }
}
