'use client'

import { Delete02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/ui/card'

export interface DangerZoneProps {
  projectName: string
  onDelete: () => void
}

export function DangerZone({ projectName, onDelete }: DangerZoneProps) {
  return (
    <Card className='border-destructive/40'>
      <CardHeader>
        <div className='flex items-center gap-2'>
          <HugeiconsIcon
            icon={Delete02Icon}
            className='size-5 text-destructive'
          />
          <h3 className='text-base font-semibold text-destructive'>
            Danger zone
          </h3>
        </div>
      </CardHeader>
      <CardContent>
        <div className='flex flex-wrap items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4'>
          <div className='space-y-1'>
            <p className='text-sm font-medium text-foreground'>
              Delete this project
            </p>
            <p className='text-sm text-muted-foreground'>
              Permanently remove{' '}
              <span className='font-semibold text-foreground'>
                {projectName}
              </span>{' '}
              and all its data. This action cannot be undone.
            </p>
          </div>
          <Button variant='destructive' size='sm' onClick={onDelete}>
            Delete project
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
