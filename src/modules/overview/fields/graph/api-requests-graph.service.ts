import type { ApiRequestsGraphProps } from './api-requests-graph.component'

export const useApiRequestsGraphService = ({ t }: ApiRequestsGraphProps) => {
  const title = t('apiRequests.title')
  const subtitle = t('apiRequests.subtitle')

  return { title, subtitle }
}
