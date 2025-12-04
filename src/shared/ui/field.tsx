'use client'

import * as React from 'react'

import { cn } from '@/shared/utils/shadcn.utils'

const Field = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-1.5', className)} {...props} />
  ),
)
Field.displayName = 'Field'

const FieldLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)}
    {...props}
  />
))
FieldLabel.displayName = 'FieldLabel'

const FieldControl = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex w-full items-center gap-2', className)} {...props} />
))
FieldControl.displayName = 'FieldControl'

const FieldMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & { state?: 'error' | 'default' }
>(({ className, state = 'default', ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      'text-xs',
      state === 'error' ? 'text-destructive' : 'text-muted-foreground',
      className,
    )}
    {...props}
  />
))
FieldMessage.displayName = 'FieldMessage'

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-xs text-muted-foreground', className)} {...props} />
))
FieldDescription.displayName = 'FieldDescription'

export { Field, FieldLabel, FieldControl, FieldMessage, FieldDescription }
