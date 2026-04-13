'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loading03Icon, CheckmarkCircle02Icon, Alert02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { useRouter } from '@/i18n/navigation'
import { ERoutes } from '@/config/routes'
import { useAuth } from '@/shared/hooks/use-auth'
import { useAcceptInvitationMutation } from '@/shared/api/invitation'

export function AcceptInvitationComponent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const acceptMutation = useAcceptInvitationMutation()

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      // Redirect to sign-in with return URL
      const returnUrl = `/invite/accept?token=${token}`
      router.push(`${ERoutes.SIGN_IN}?next=${encodeURIComponent(returnUrl)}`)
      return
    }

    if (!token) return
    if (acceptMutation.isPending || acceptMutation.isSuccess || acceptMutation.isError) return

    acceptMutation.mutate({ token })
  }, [user, authLoading, token, router, acceptMutation])

  useEffect(() => {
    if (acceptMutation.isSuccess) {
      const timeout = setTimeout(() => {
        router.push(ERoutes.DASHBOARD)
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [acceptMutation.isSuccess, router])

  if (!token) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='flex flex-col items-center gap-4 text-center'>
          <HugeiconsIcon icon={Alert02Icon} className='size-10 text-destructive' />
          <p className='text-sm text-muted-foreground'>Invalid invitation link.</p>
        </div>
      </div>
    )
  }

  if (authLoading || acceptMutation.isPending) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='flex flex-col items-center gap-4 text-center'>
          <HugeiconsIcon
            icon={Loading03Icon}
            className='size-10 animate-spin text-muted-foreground'
          />
          <p className='text-sm text-muted-foreground'>Accepting invitation...</p>
        </div>
      </div>
    )
  }

  if (acceptMutation.isError) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='flex flex-col items-center gap-4 text-center'>
          <HugeiconsIcon icon={Alert02Icon} className='size-10 text-destructive' />
          <p className='text-sm font-medium text-foreground'>Could not accept invitation</p>
          <p className='text-sm text-muted-foreground'>
            {acceptMutation.error.message}
          </p>
          <button
            onClick={() => router.push(ERoutes.SIGN_IN)}
            className='mt-2 text-sm text-primary underline underline-offset-4 hover:text-primary/80'
          >
            Go to sign in
          </button>
        </div>
      </div>
    )
  }

  if (acceptMutation.isSuccess) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='flex flex-col items-center gap-4 text-center'>
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            className='size-10 text-emerald-500'
          />
          <p className='text-sm font-medium text-foreground'>Invitation accepted!</p>
          <p className='text-sm text-muted-foreground'>
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    )
  }

  return null
}
