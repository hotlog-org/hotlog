import { eventSchemas } from '@/modules/events/mock-data'

import type {
  ModuleDefinition,
  ModuleFieldType,
  ModuleSchemaDefinition,
} from './modules.interface'

const mapFieldType = (type: string): ModuleFieldType => {
  switch (type) {
    case 'number':
    case 'boolean':
    case 'datetime':
    case 'enum':
    case 'array':
    case 'json':
      return type
    default:
      return 'string'
  }
}

export const moduleSchemas: ModuleSchemaDefinition[] = eventSchemas.map(
  (schema) => ({
    id: schema.id,
    name: schema.name,
    fields: schema.fields.map((field) => ({
      key: field.key,
      label: field.label,
      type: mapFieldType(field.type),
    })),
  }),
)

export const modulesMock: ModuleDefinition[] = [
  {
    id: 'website-analytics',
    name: 'Website Analytics',
    color: '#3b82f6',
    heroTitle: 'Website Analytics',
    heroDescription: 'Landing page conversions and signups from web.',
    components: [
      {
        id: 'website-traffic',
        kind: 'chart',
        visualization: 'area',
        schemaId: 'order-created',
        title: 'Acquisition pulse',
        description: 'Web signups grouped by plan over time.',
        bindings: [
          { inputId: 'timestamp', fieldKey: 'placedAt' },
          { inputId: 'value', fieldKey: 'amount' },
          { inputId: 'category', fieldKey: 'currency' },
        ],
      },
      {
        id: 'website-top-country',
        kind: 'chart',
        visualization: 'pie',
        schemaId: 'user-signup',
        title: 'Referrals breakdown',
        description: 'Top acquisition channels over the last month.',
        bindings: [
          { inputId: 'category', fieldKey: 'referral' },
          { inputId: 'value', fieldKey: 'marketingConsent' },
        ],
      },
    ],
  },
  {
    id: 'mobile-app',
    name: 'Mobile App',
    color: '#8b5cf6',
    heroTitle: 'Mobile App',
    heroDescription: 'Session quality across the mobile surfaces.',
    components: [
      {
        id: 'mobile-heatmap',
        kind: 'chart',
        visualization: 'heatmap',
        schemaId: 'order-created',
        title: 'Session patterns',
        description: 'Daily returning users per device form factor.',
        bindings: [
          { inputId: 'x', fieldKey: 'shippingCountry' },
          { inputId: 'y', fieldKey: 'placedAt' },
          { inputId: 'value', fieldKey: 'amount' },
        ],
      },
      {
        id: 'mobile-latency',
        kind: 'chart',
        visualization: 'histogram',
        schemaId: 'payment-failed',
        title: 'Attempts distribution',
        description: 'Retry attempts grouped into buckets.',
        bindings: [
          { inputId: 'value', fieldKey: 'attempts' },
        ],
      },
    ],
  },
  {
    id: 'api-monitoring',
    name: 'API Monitoring',
    color: '#10b981',
    heroTitle: 'API Monitoring',
    heroDescription: 'Request volume and failure rates across services.',
    components: [
      {
        id: 'api-requests',
        kind: 'chart',
        visualization: 'line',
        schemaId: 'order-created',
        title: 'Request throughput',
        description: 'Amount per currency over time.',
        bindings: [
          { inputId: 'timestamp', fieldKey: 'placedAt' },
          { inputId: 'value', fieldKey: 'amount' },
          { inputId: 'category', fieldKey: 'currency' },
        ],
      },
      {
        id: 'api-errors',
        kind: 'chart',
        visualization: 'bar',
        schemaId: 'payment-failed',
        title: 'Errors by reason',
        description: 'Payment failures grouped by reason.',
        bindings: [
          { inputId: 'category', fieldKey: 'reason' },
          { inputId: 'value', fieldKey: 'attempts' },
        ],
      },
    ],
  },
  {
    id: 'user-behavior',
    name: 'User Behavior',
    color: '#f59e0b',
    heroTitle: 'User Behavior',
    heroDescription: 'User journeys with funnel drop-offs.',
    components: [
      {
        id: 'user-funnel',
        kind: 'chart',
        visualization: 'stackedBar',
        schemaId: 'user-signup',
        title: 'Funnel health',
        description: 'Consent opt-ins by plan selection.',
        bindings: [
          { inputId: 'category', fieldKey: 'plan' },
          { inputId: 'value', fieldKey: 'marketingConsent' },
        ],
      },
      {
        id: 'user-timeline',
        kind: 'chart',
        visualization: 'timeline',
        schemaId: 'payment-failed',
        title: 'Failures timeline',
        description: 'Sequenced failures to spot noisy retries.',
        bindings: [
          { inputId: 'name', fieldKey: 'reason' },
          { inputId: 'start', fieldKey: 'failureAt' },
          { inputId: 'end', fieldKey: 'failureAt' },
          { inputId: 'category', fieldKey: 'severity' },
        ],
      },
    ],
  },
]
