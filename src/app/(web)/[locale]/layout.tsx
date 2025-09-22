import '@/config/styles/globals.css'

import { routing } from '@/i18n/routing'
import { AuthProvider } from '@/lib/better-auth'
import { ApiProvider } from '@/lib/rest-api/provider'
import { cn } from '@/shared/utils/shadcn.utils'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { ThemeProvider } from 'next-themes'
import { Geist, Newsreader } from 'next/font/google'
import { notFound } from 'next/navigation'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
})

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

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(geist.variable, newsreader.variable)}
    >
      <body>
        <AuthProvider>
          <ApiProvider>
            <NextIntlClientProvider>
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
        </AuthProvider>
      </body>
    </html>
  )
}
