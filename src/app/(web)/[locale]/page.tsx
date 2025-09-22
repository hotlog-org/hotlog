'use client'

import { Link } from '@/i18n/navigation'
import { useAuth } from '@/shared/hooks'
import { Loader2 } from 'lucide-react'

export default function RootPage() {
  const { isLogged, user, isLoading } = useAuth()

  return (
    <>
      {isLoading ? (
        <Loader2 className='animate-spin' />
      ) : (
        <>
          <p className='text-red-500'>Hello {JSON.stringify(user)}</p>
          <p className='text-red-500'>Is logged: {isLogged ? 'yes' : 'no'}</p>
          <Link href='/sign-in'>sign-in</Link>
        </>
      )}
    </>
  )
}
