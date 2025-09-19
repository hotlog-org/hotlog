import { getTranslations } from 'next-intl/server'

export const getHomeService = async () => {
  const t = await getTranslations('modules.home')

  return {
    t,
  }
}
