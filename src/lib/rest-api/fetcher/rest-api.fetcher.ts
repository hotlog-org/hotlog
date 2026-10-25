import ky, { type KyInstance } from 'ky'

import { envClient } from '@/config/env'

import { normalizeHttpError } from './rest-api.error'

// fetcher
export const restApiFetcher: KyInstance = ky.create({
  prefixUrl: `${envClient.NEXT_PUBLIC_CLIENT_API_URL}`,
  credentials: 'include',
  throwHttpErrors: true,
  // HTTP statuses were not retried before normalization. Keep network retry
  // defaults, but never introduce retries for failed DELETEs (or other statuses).
  retry: { statusCodes: [] },
  hooks: { beforeError: [normalizeHttpError] },
})
