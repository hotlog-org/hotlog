'use client'

import LandingComponent from './field/client/landing-component-client'
import { useLandingService } from './landing.client.service'

type Props = {
  translations?: Record<string, string>
}

export default function LandingClient({ translations }: Props) {
  const service = useLandingService(translations)
  const t = (key: string) => translations?.[key] ?? (service.t ? service.t(key) : key)

  return (
    <LandingComponent
      t={t}
      dateRange={service.dateRange}
      setDateRange={service.setDateRange}
      timeSeries={service.timeSeries}
      status={service.status}
      heatmap={service.heatmap}
    />
  )
}