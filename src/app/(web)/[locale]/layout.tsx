import '@/config/styles/globals.css'

import { routing } from '@/i18n/routing'
import { ApiProvider } from '@/lib/rest-api/provider'
import { cn } from '@/shared/utils/shadcn.utils'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { ThemeProvider } from 'next-themes'
import { Geist } from 'next/font/google'
import { notFound } from 'next/navigation'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  const messages = (await import(`../../../../messages/${locale}.json`)).default

  return (
    <html lang={locale} suppressHydrationWarning className={cn(geist.variable)}>
      <body>
        <ApiProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <ThemeProvider
              attribute={'class'}
              defaultTheme={'system'}
              disableTransitionOnChange
              enableSystem
            >
              <main className={cn('h-[calc(100vh)]')}>{children}</main>
            </ThemeProvider>
          </NextIntlClientProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </ApiProvider>
      </body>
    </html>
  )
}
