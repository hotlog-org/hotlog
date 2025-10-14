'use client'

import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Copy, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

interface SetupSectionProps {
  apiKey: string
}

export function SetupSection({ apiKey }: SetupSectionProps) {
  const [showApiKey, setShowApiKey] = useState(false)
  const [copiedInstall, setCopiedInstall] = useState(false)
  const [copiedApiKey, setCopiedApiKey] = useState(false)

  const installCommand = 'npm i hotlog'

  const handleCopyInstall = () => {
    navigator.clipboard.writeText(installCommand)
    setCopiedInstall(true)
    setTimeout(() => setCopiedInstall(false), 2000)
  }

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey)
    setCopiedApiKey(true)
    setTimeout(() => setCopiedApiKey(false), 2000)
  }

  return (
    <Card className='p-6'>
      <div className='space-y-4'>
        {/* API Key */}
        <div>
          <label className='mb-2 block text-sm font-medium'>API Key</label>
          <div className='flex gap-2'>
            <div className='relative flex-1'>
              <Input
                value={apiKey}
                type={showApiKey ? 'text' : 'password'}
                readOnly
                className='pr-10 font-mono text-sm'
              />
              <Button
                variant='ghost'
                size='icon'
                className='absolute right-0 top-0 h-full'
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className='h-4 w-4' />
                ) : (
                  <Eye className='h-4 w-4' />
                )}
              </Button>
            </div>
            <Button
              variant='outline'
              size='icon'
              onClick={handleCopyApiKey}
              className='shrink-0'
            >
              <Copy className='h-4 w-4' />
            </Button>
          </div>
          {copiedApiKey && (
            <p className='mt-1 text-xs text-green-600'>Copied to clipboard!</p>
          )}
        </div>
      </div>
    </Card>
  )
}
