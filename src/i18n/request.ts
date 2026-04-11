import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

type MessageTree = { [key: string]: string | MessageTree }

const isPlainObject = (value: unknown): value is MessageTree =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Deep-merge `override` on top of `base`. For any key missing or set to
// a non-string in the override, the value from `base` is used. This lets
// non-default locales translate only the keys they care about and fall
// back to English everywhere else.
const deepMerge = (base: MessageTree, override: MessageTree): MessageTree => {
  const result: MessageTree = { ...base }

  for (const key of Object.keys(override)) {
    const overrideValue = override[key]
    const baseValue = base[key]

    if (isPlainObject(overrideValue) && isPlainObject(baseValue)) {
      result[key] = deepMerge(baseValue, overrideValue)
    } else if (overrideValue !== undefined && overrideValue !== null) {
      result[key] = overrideValue
    }
  }

  return result
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  const englishMessages = (await import(`../../messages/en.json`))
    .default as MessageTree

  if (locale === routing.defaultLocale) {
    return {
      locale,
      messages: englishMessages,
    }
  }

  const localeMessages = (await import(`../../messages/${locale}.json`))
    .default as MessageTree

  return {
    locale,
    messages: deepMerge(englishMessages, localeMessages),
  }
})
