import { useTranslations } from 'next-intl'

export const useNotFoundService = () => {
  const t = useTranslations('not-found')

  return {
    t,
  }
}
