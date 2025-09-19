'use client'

import { Link } from '@/i18n/navigation'
import { MoveLeft } from 'lucide-react'
import { useNotFoundService } from './not-found.service'

const NotFoundComponent = () => {
  const service = useNotFoundService()

  return (
    <div id='container' className='space-y-3'>
      <div className='space-y-0'>
        <h1>{service.t('title')}</h1>
        <p className='text-foreground/40'>{service.t('description')}</p>
      </div>
      <Link href={'/'} className='flex gap-2 w-fit items-center'>
        <MoveLeft className='w-4 h-4 text-foreground/50' />
        <p className='text-foreground/70' id='link'>
          Go home
        </p>
      </Link>
    </div>
  )
}

export default NotFoundComponent
