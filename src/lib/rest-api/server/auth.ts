import { auth } from '@/lib/better-auth/auth'

export const getApiUserId = async (
  request: Request,
): Promise<string | null> => {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  return session?.user?.id ?? null
}
