'use client'

import { Loading03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Skeleton } from '@/shared/ui/skeleton'
import type { IProjectApiKeyDto } from '@/shared/api/interface'
import type { TFunction } from '../../overview.service'
import { useApiKeyCardService } from './api-key-card.service'

export interface ApiKeyCardProps {
  keyValue: string | null
  keys: IProjectApiKeyDto[]
  selectedId: number | null
  onSelect: (id: number | null) => void
  onDismiss: () => void
  onRevoke: () => void
  error: string | null
  loading: boolean
  canRead: boolean
  canCreate: boolean
  canDelete: boolean
  isRegenerating: boolean
  t: TFunction
  onCreate: () => void
  onRegenerate: () => void
}

export function ApiKeyCard(props: ApiKeyCardProps) {
  const service = useApiKeyCardService(props)
  const activeKeys = props.keys.filter((key) => !key.revoked_at)
  const selected = activeKeys.find((key) => key.id === props.selectedId)
  const disabled = props.loading || props.isRegenerating

  return (
    <Card className='p-4 md:p-6'>
      <div className='flex flex-col gap-4'>
        <div className='flex items-center gap-2'>
          <h2 className='text-lg font-semibold'>{props.t('apiKey.title')}</h2>
          {props.isRegenerating && (
            <HugeiconsIcon
              icon={Loading03Icon}
              className='size-4 animate-spin'
              aria-hidden='true'
            />
          )}
        </div>
        <p className='text-sm text-muted-foreground'>
          {props.t('apiKey.subtitle')}
        </p>
        <p className='text-sm text-muted-foreground'>
          {props.t('apiKey.lostResponse')}
        </p>
        {props.error && (
          <p role='alert' className='text-sm text-destructive'>
            {props.error}
          </p>
        )}
        {props.canRead && activeKeys.length > 0 && (
          <label className='flex flex-col gap-2'>
            {props.t('apiKey.select')}
            <select
              value={selected?.id ?? ''}
              onChange={(event) =>
                props.onSelect(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              disabled={disabled}
              className='rounded border bg-background p-2'
            >
              <option value=''>{props.t('apiKey.select')}</option>
              {activeKeys.map((key) => (
                <option key={key.id} value={key.id}>
                  #{key.id} · {key.key_prefix}…
                </option>
              ))}
            </select>
          </label>
        )}
        {props.loading && props.canRead && (
          <div
            role='status'
            aria-label={props.t('apiKey.loading')}
            className='space-y-2'
          >
            <Skeleton className='h-4 w-32' />
            <Skeleton className='h-10 w-full' />
          </div>
        )}
        {props.loading && !props.canRead && (
          <div
            role='status'
            className='flex items-center gap-2 text-sm text-muted-foreground'
          >
            <HugeiconsIcon
              icon={Loading03Icon}
              className='size-4 animate-spin'
            />
            {props.t('apiKey.loading')}
          </div>
        )}
        {!props.loading && props.canRead && activeKeys.length === 0 && (
          <p>{props.t('apiKey.empty')}</p>
        )}
        {!props.loading && !props.canRead && <p>{props.t('apiKey.noRead')}</p>}
        {props.keyValue && (
          <div className='flex flex-col gap-2'>
            <p>{props.t('apiKey.once')}</p>
            <Input
              aria-label={props.t('apiKey.secret')}
              readOnly
              value={props.keyValue}
              type={service.visible ? 'text' : 'password'}
              className='font-mono text-sm'
            />
            <div className='flex gap-2'>
              <Button
                variant='outline'
                onClick={service.handleToggleVisibility}
              >
                {props.t(service.visible ? 'apiKey.hide' : 'apiKey.reveal')}
              </Button>
              <Button variant='outline' onClick={service.handleCopy}>
                {props.t('apiKey.copy')}
              </Button>
              <Button variant='outline' onClick={props.onDismiss}>
                {props.t('apiKey.dismiss')}
              </Button>
            </div>
            {service.copied && <p role='status'>{props.t('apiKey.copied')}</p>}
          </div>
        )}
        <div className='flex gap-2'>
          {props.canCreate && (
            <Button
              variant='outline'
              disabled={disabled}
              onClick={props.onCreate}
            >
              {props.t('apiKey.generate')}
            </Button>
          )}
          {props.canCreate && props.canDelete && activeKeys.length > 0 && (
            <Button
              variant='outline'
              disabled={disabled || !selected}
              onClick={service.handleRegenerate}
            >
              {props.t('apiKey.rotate')}
            </Button>
          )}
          {props.canDelete && activeKeys.length > 0 && (
            <Button
              variant='outline'
              disabled={disabled || !selected}
              onClick={props.onRevoke}
            >
              {props.t('apiKey.revoke')}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
