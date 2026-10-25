import type { HTTPError } from 'ky'

export async function normalizeHttpError(error: HTTPError): Promise<HTTPError> {
  let message = `Request failed with status ${error.response.status}`
  try {
    const body: unknown = await error.response.clone().json()
    if (body && typeof body === 'object' && 'error' in body) {
      const detail = body.error
      if (
        detail &&
        typeof detail === 'object' &&
        'message' in detail &&
        typeof detail.message === 'string' &&
        detail.message.trim()
      ) {
        message = detail.message
      }
    }
  } catch {
    // Empty, malformed and non-JSON errors still have useful status metadata.
  }
  error.message = message
  return error
}
