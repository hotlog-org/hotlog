'use client'

import { useEffect, useState } from 'react'

export interface UseDeleteProjectModalServiceProps {
  open: boolean
  projectName: string
  onSubmit: () => void
}

export const useDeleteProjectModalService = ({
  open,
  projectName,
  onSubmit,
}: UseDeleteProjectModalServiceProps) => {
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setConfirmation('')
      setError(null)
    }
  }, [open])

  const isMatching = confirmation.trim() === projectName

  const handleSubmit = () => {
    if (!isMatching) {
      setError('Project name does not match')
      return
    }

    setError(null)
    onSubmit()
  }

  return {
    confirmation,
    setConfirmation,
    error,
    isMatching,
    handleSubmit,
  }
}
