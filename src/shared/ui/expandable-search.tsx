'use client'

import { useEffect, useRef, useState } from 'react'
import { Search as LucideSearch, X as LucideX } from 'lucide-react'

import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

export interface ExpandableSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function ExpandableSearch(props: ExpandableSearchProps) {
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
        className='h-9'
        onClick={() => {
          setOpen(true)
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
      >
        <LucideSearch className='size-4' />
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
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className='h-9 w-48 pl-8 pr-8 text-sm sm:w-64'
      />
      <LucideSearch className='text-muted-foreground absolute left-2 top-1/2 size-4 -translate-y-1/2' />
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
