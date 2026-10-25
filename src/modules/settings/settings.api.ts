import { restApiFetcher } from '@/lib/rest-api/fetcher'

export async function leaveProjectApi(projectId: string) {
  await restApiFetcher.post(
    `user/projects/${encodeURIComponent(projectId)}/leave`,
    { retry: 0 },
  )
}

export async function deleteAccountApi(confirmation: string) {
  await restApiFetcher.delete('user/account', {
    json: { confirmation },
    retry: 0,
  })
}
