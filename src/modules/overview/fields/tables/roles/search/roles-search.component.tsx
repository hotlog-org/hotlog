'use client'

import { useEffect, useRef, useState } from 'react'
import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { X as LucideX } from 'lucide-react'

import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

import type { TFunction } from '../../../../overview.service'

export interface RolesSearchProps {
  value: string
  onChange: (value: string) => void
  t: TFunction
}

export function RolesSearch(props: RolesSearchProps) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        !props.value
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, props.value])

  if (!open) {
    return (
      <Button
        size='sm'
        variant='outline'
        onClick={() => {
          setOpen(true)
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
      >
        <HugeiconsIcon icon={Search01Icon} className='size-4' />
      </Button>
    )
  }

  return (
    <div
      ref={containerRef}
      className='relative animate-in fade-in slide-in-from-right-2 duration-200'
    >
      <Input
        ref={inputRef}
        autoFocus
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.t('roles.searchPlaceholder')}
        className='h-8 w-48 pl-9 pr-8 text-sm sm:w-64'
      />
      <HugeiconsIcon
        icon={Search01Icon}
        className='text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2'
      />
      <button
        type='button'
        className='absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground'
        onClick={() => {
          props.onChange('')
          setOpen(false)
        }}
      >
        <LucideX className='size-4' />
      </button>
    </div>
  )
}
