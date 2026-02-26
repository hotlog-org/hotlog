import { format } from 'date-fns'
import React from 'react'

import type { FieldType, SchemaField } from '@/lib/events/events.contract'
import type { TFunction } from '../../events.service'
import type { DetailDrawerProps } from './detail-drawer.component'
import { ArrayField } from './types/array-field.component'
import { BooleanField } from './types/boolean-field.component'
import { DateTimeField } from './types/datetime-field.component'
import { EnumField } from './types/enum-field.component'
import { JsonField } from './types/json-field.component'
import { NumberField } from './types/number-field.component'
import { StringField } from './types/string-field.component'

export interface FieldRowConfig {
  field: SchemaField
  value: unknown
}

export type FieldRenderer = (value: unknown, t: TFunction) => React.JSX.Element

export type RenderersMap = Record<FieldType, FieldRenderer>

export const renderers: RenderersMap = {
  string: (value, t) => <StringField value={value} t={t} />, // default text
  number: (value, t) => <NumberField value={value} t={t} />,
  boolean: (value, t) => <BooleanField value={value} t={t} />,
  datetime: (value, t) => <DateTimeField value={value} t={t} />,
  enum: (value, t) => <EnumField value={value} t={t} />,
  json: (value, t) => <JsonField value={value} t={t} />,
  array: (value, t) => <ArrayField value={value} t={t} />,
}

export const useDetailDrawerService = (
  props: DetailDrawerProps,
): DetailDrawerProps & {
  fieldRows: FieldRowConfig[]
  createdLabel: string
} => {
  const fieldRows: FieldRowConfig[] = props.schema
    ? props.schema.fields.map((field) => ({
        field,
        value: (props.event?.payload ?? {})[field.key],
      }))
    : []

  const createdLabel = props.event
    ? format(new Date(props.event.createdAt), 'PPP p')
    : ''

  return {
    ...props,
    fieldRows,
    createdLabel,
  }
}
