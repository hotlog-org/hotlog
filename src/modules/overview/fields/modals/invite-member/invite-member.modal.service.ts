import { useEffect, useState } from 'react'
import { z } from 'zod'
import type { InviteMemberModalProps } from './invite-member.modal'

const schema = z.object({
  email: z.string().email(),
})

export const useInviteMemberModalService = ({
  open,
  onSubmit,
}: InviteMemberModalProps) => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setEmail('')
      setError(null)
    }
  }, [open])

  const handleSubmit = () => {
    const parsed = schema.safeParse({ email })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid email')
      return
    }

    setError(null)
    onSubmit(parsed.data.email)
    setEmail('')
  }

  return {
    email,
    error,
    setEmail,
    handleSubmit,
  }
}
