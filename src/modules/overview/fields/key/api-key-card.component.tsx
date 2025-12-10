'use client'

import {
  ArrowReloadVerticalIcon,
  Copy01Icon,
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
  keyValue: string
  t: TFunction
  onRegenerate: () => string
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

        <Button
          variant='outline'
          size='sm'
          className='inline-flex items-center gap-2'
          onClick={service.handleRegenerate}
        >
          <HugeiconsIcon icon={ArrowReloadVerticalIcon} className='size-4' />
          {props.t('apiKey.generate')}
        </Button>
      </div>

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
          <FieldMessage
            className='flex items-center gap-2 text-xs'
            state={service.copied ? 'default' : 'default'}
          >
            {service.copied ? props.t('apiKey.copied') : props.t('apiKey.hint')}
          </FieldMessage>
        </Field>
      </div>
    </Card>
  )
}
