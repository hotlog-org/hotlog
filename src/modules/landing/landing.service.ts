import { getTranslations } from 'next-intl/server'

export const getLandingService = async () => {
  const t = await getTranslations('modules.landing')

  return {
    t,
  }
}
