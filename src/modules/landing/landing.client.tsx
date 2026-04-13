'use client'

import LandingComponent from './field/client/landing-component-client'

type Props = {
  translations?: Record<string, string>
}

export default function LandingClient({ translations }: Props) {
  const t = (key: string) => translations?.[key] ?? key

  return <LandingComponent t={t} />
}
