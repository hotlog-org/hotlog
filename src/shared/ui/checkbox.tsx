'use client'

import * as React from 'react'
import { Check, Minus } from 'lucide-react'

import { cn } from '@/shared/utils/shadcn.utils'

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  indeterminate?: boolean
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate, checked, disabled, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null)

    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement)

    React.useEffect(() => {
      if (innerRef.current) {
        innerRef.current.indeterminate = Boolean(indeterminate)
      }
    }, [indeterminate])

    const isChecked = Boolean(checked)
    const showIcon = isChecked || indeterminate

    return (
      <span
        className={cn(
          'relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-input bg-background transition-colors',
          (isChecked || indeterminate) && 'border-primary bg-primary',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        <input
          ref={innerRef}
          type='checkbox'
          checked={isChecked}
          disabled={disabled}
          className='absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed'
          {...props}
        />
        {showIcon ? (
          indeterminate ? (
            <Minus className='size-3 text-primary-foreground' strokeWidth={3} />
          ) : (
            <Check className='size-3 text-primary-foreground' strokeWidth={3} />
          )
        ) : null}
      </span>
    )
  },
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
