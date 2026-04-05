import { useCallback, useMemo, useState } from 'react'
import type { ApiKeyCardProps } from './api-key-card.component'

export const useApiKeyCardService = ({
  keyValue,
  onRegenerate,
}: ApiKeyCardProps) => {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  const maskedKey = useMemo(() => {
    if (!keyValue) return ''
    if (visible) return keyValue
    const tail = keyValue.slice(-6)
    const masked = '•'.repeat(Math.max(12, keyValue.length - tail.length))
    return `${masked}${tail}`
  }, [keyValue, visible])

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
    maskedKey,
    handleCopy,
    handleToggleVisibility,
    handleRegenerate,
  }
}
