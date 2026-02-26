import { ApiErrorCode, buildApiError } from '@/lib/rest-api/server/response'
import { getApiUserId } from '@/lib/rest-api/server/auth'
import { proxyToGoApi } from '@/lib/rest-api/server/proxy'

export const GET = async (request: Request) => {
  const userId = await getApiUserId(request)
  if (!userId) {
    return buildApiError({ code: ApiErrorCode.UNAUTHORIZED, status: 401 })
  }

  return proxyToGoApi({ request, userId, path: '/events/schemas' })
}

export const POST = async (request: Request) => {
  const userId = await getApiUserId(request)
  if (!userId) {
    return buildApiError({ code: ApiErrorCode.UNAUTHORIZED, status: 401 })
  }

  return proxyToGoApi({ request, userId, path: '/events/schemas' })
}
