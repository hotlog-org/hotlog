import type { ApiRequestsGraphProps } from './api-requests-graph.component'

export const useApiRequestsGraphService = ({ t }: ApiRequestsGraphProps) => {
  const title = t('apiRequests.title')
  const subtitle = t('apiRequests.subtitle')
  const emptyState = t('apiRequests.empty')

  return { title, subtitle, emptyState }
}
