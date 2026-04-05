'use client'

import {
  ArrowReloadVerticalIcon,
  Copy01Icon,
  Loading03Icon,
  ViewIcon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import {
  Field,
  FieldControl,
  FieldLabel,
  FieldMessage,
} from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'

import type { TFunction } from '../../overview.service'
import { useApiKeyCardService } from './api-key-card.service'

export interface ApiKeyCardProps {
  keyValue: string | null
  loading: boolean
  canRead: boolean
  canCreate: boolean
  isRegenerating: boolean
  t: TFunction
  onRegenerate: () => void
}

export function ApiKeyCard(props: ApiKeyCardProps) {
  const service = useApiKeyCardService(props)

  return (
    <Card className='p-4 md:p-6'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h2 className='text-lg font-semibold text-foreground'>
            {props.t('apiKey.title')}
          </h2>
          <p className='text-sm text-muted-foreground'>
            {props.t('apiKey.subtitle')}
          </p>
        </div>

        {props.canCreate && (
          <Button
            variant='outline'
            size='sm'
            className='inline-flex items-center gap-2'
            onClick={service.handleRegenerate}
            disabled={props.isRegenerating || props.loading}
          >
            <HugeiconsIcon
              icon={
                props.isRegenerating ? Loading03Icon : ArrowReloadVerticalIcon
              }
              className={`size-4 ${props.isRegenerating ? 'animate-spin' : ''}`}
            />
            {props.t('apiKey.generate')}
          </Button>
        )}
      </div>

      {!props.canRead ? (
        <p className='mt-4 text-sm text-muted-foreground'>
          You don&apos;t have permission to view API keys.
        </p>
      ) : props.loading ? (
        <div className='mt-4 flex items-center gap-2 text-sm text-muted-foreground'>
          <HugeiconsIcon icon={Loading03Icon} className='size-4 animate-spin' />
          Loading...
        </div>
      ) : !props.keyValue ? (
        <p className='mt-4 text-sm text-muted-foreground'>
          No API key yet.{' '}
          {props.canCreate
            ? 'Click Generate to create one.'
            : 'Ask an admin to generate one.'}
        </p>
      ) : (
        <div className='mt-4 space-y-2'>
          <Field className='space-y-2'>
            <FieldLabel>{props.t('apiKey.label')}</FieldLabel>
            <FieldControl>
              <Input
                readOnly
                value={service.maskedKey}
                type={service.visible ? 'text' : 'password'}
                className='font-mono text-sm'
              />
              <Button
                variant='ghost'
                size='icon'
                className='shrink-0'
                onClick={service.handleToggleVisibility}
                aria-label={props.t(
                  service.visible ? 'apiKey.hide' : 'apiKey.reveal',
                )}
              >
                <HugeiconsIcon
                  icon={service.visible ? ViewOffIcon : ViewIcon}
                  className='size-5'
                />
              </Button>
              <Button
                variant='outline'
                size='icon'
                className='shrink-0'
                onClick={service.handleCopy}
                aria-label={props.t('apiKey.copy')}
              >
                <HugeiconsIcon icon={Copy01Icon} className='size-5' />
              </Button>
            </FieldControl>
            <FieldMessage className='flex items-center gap-2 text-xs'>
              {service.copied
                ? props.t('apiKey.copied')
                : props.t('apiKey.hint')}
            </FieldMessage>
          </Field>
        </div>
      )}
    </Card>
  )
}
