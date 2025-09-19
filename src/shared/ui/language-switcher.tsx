'use client'

import { routing } from '@/i18n/routing'
import { Globe } from 'lucide-react'
import { useLocale } from 'next-intl'

import { usePathname, useRouter } from '@/i18n/navigation'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu'

const languageNames = {
  en: 'English',
  ru: 'Русский',
  am: 'Հայերեն',
} as const

export function LanguageSwitcher() {
  const pathname = usePathname()
  const router = useRouter()
  const currentLocale = useLocale() as keyof typeof languageNames

  const switchLanguage = (locale: string) => {
    router.push(pathname, { locale: locale })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='sm'>
          <Globe className='h-4 w-4' />
          <span className='ml-2'>
            {languageNames[currentLocale] || languageNames.en}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {routing.locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => switchLanguage(locale)}
            className={currentLocale === locale ? 'bg-accent' : ''}
          >
            {languageNames[locale as keyof typeof languageNames]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
