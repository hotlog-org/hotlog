import { useCallback, useEffect, useState } from 'react'
import type { ApiKeyCardProps } from './api-key-card.component'

export const useApiKeyCardService = ({
  keyValue,
  onRegenerate,
}: ApiKeyCardProps) => {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setVisible(false)
    setCopied(false)
  }, [keyValue])

  const handleCopy = useCallback(async () => {
    if (!keyValue) return
    try {
      await navigator.clipboard.writeText(keyValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }, [keyValue])

  const handleToggleVisibility = useCallback(() => {
    setVisible((state) => !state)
  }, [])

  const handleRegenerate = useCallback(() => {
    onRegenerate()
    setVisible(false)
  }, [onRegenerate])

  return {
    visible,
    copied,
    handleCopy,
    handleToggleVisibility,
    handleRegenerate,
  }
}
