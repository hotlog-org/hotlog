import { ApiErrorCode, buildApiError } from '@/lib/rest-api/server/response'
import { getApiUserId } from '@/lib/rest-api/server/auth'
import { proxyToGoApi } from '@/lib/rest-api/server/proxy'

interface RouteContext {
  params: Promise<{ id: string }>
}

export const GET = async (request: Request, context: RouteContext) => {
  const userId = await getApiUserId(request)
  if (!userId) {
    return buildApiError({ code: ApiErrorCode.UNAUTHORIZED, status: 401 })
  }

  const { id } = await context.params

  return proxyToGoApi({
    request,
    userId,
    path: `/events/${encodeURIComponent(id)}`,
  })
}

export const PATCH = async (request: Request, context: RouteContext) => {
  const userId = await getApiUserId(request)
  if (!userId) {
    return buildApiError({ code: ApiErrorCode.UNAUTHORIZED, status: 401 })
  }

  const { id } = await context.params

  return proxyToGoApi({
    request,
    userId,
    path: `/events/${encodeURIComponent(id)}`,
  })
}

export const DELETE = async (request: Request, context: RouteContext) => {
  const userId = await getApiUserId(request)
  if (!userId) {
    return buildApiError({ code: ApiErrorCode.UNAUTHORIZED, status: 401 })
  }

  const { id } = await context.params

  return proxyToGoApi({
    request,
    userId,
    path: `/events/${encodeURIComponent(id)}`,
  })
}
