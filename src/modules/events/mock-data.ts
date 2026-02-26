import { formatISO } from 'date-fns'

import type {
  EventRecord,
  EventSchema,
  EventStatus,
} from '@/lib/events/events.contract'

const seedDate = new Date('2025-11-25T12:00:00Z').getTime()

const buildDate = (index: number) =>
  formatISO(new Date(seedDate - index * 1000 * 60 * 90))

export const eventSchemas: EventSchema[] = [
  {
    id: 'user-signup',
    name: 'User Signup',
    version: '1.2',
    fields: [
      { key: 'userId', label: 'User ID', type: 'string' },
      { key: 'email', label: 'Email', type: 'string' },
      {
        key: 'plan',
        label: 'Plan',
        type: 'enum',
        enumValues: ['free', 'pro', 'enterprise'],
      },
      { key: 'marketingConsent', label: 'Marketing Consent', type: 'boolean' },
      { key: 'signedUpAt', label: 'Signed Up At', type: 'datetime' },
      { key: 'referral', label: 'Referral Code', type: 'string' },
    ],
  },
  {
    id: 'order-created',
    name: 'Order Created',
    version: '2.1',
    fields: [
      { key: 'orderId', label: 'Order ID', type: 'string' },
      { key: 'amount', label: 'Amount', type: 'number' },
      {
        key: 'currency',
        label: 'Currency',
        type: 'enum',
        enumValues: ['USD', 'EUR', 'GBP', 'JPY'],
      },
      { key: 'items', label: 'Items', type: 'array' },
      { key: 'shippingCountry', label: 'Shipping Country', type: 'string' },
      { key: 'placedAt', label: 'Placed At', type: 'datetime' },
      { key: 'newCustomer', label: 'New Customer', type: 'boolean' },
    ],
  },
  {
    id: 'payment-failed',
    name: 'Payment Failed',
    version: '1.5',
    fields: [
      { key: 'paymentId', label: 'Payment ID', type: 'string' },
      {
        key: 'reason',
        label: 'Reason',
        type: 'enum',
        enumValues: [
          'card_declined',
          'insufficient_funds',
          'expired_card',
          'network_error',
        ],
      },
      { key: 'retryable', label: 'Retryable', type: 'boolean' },
      { key: 'attempts', label: 'Attempts', type: 'number' },
      { key: 'failureAt', label: 'Failure At', type: 'datetime' },
      { key: 'region', label: 'Region', type: 'string' },
    ],
  },
  {
    id: 'session-started',
    name: 'Session Started',
    version: '3.0',
    fields: [
      { key: 'sessionId', label: 'Session ID', type: 'string' },
      {
        key: 'device',
        label: 'Device',
        type: 'enum',
        enumValues: ['ios', 'android', 'web', 'desktop'],
      },
      { key: 'location', label: 'Location', type: 'json' },
      { key: 'osVersion', label: 'OS Version', type: 'string' },
      { key: 'startedAt', label: 'Started At', type: 'datetime' },
      { key: 'returning', label: 'Returning User', type: 'boolean' },
    ],
  },
  {
    id: 'system-alert',
    name: 'System Alert',
    version: '0.9',
    fields: [
      { key: 'alertId', label: 'Alert ID', type: 'string' },
      {
        key: 'severity',
        label: 'Severity',
        type: 'enum',
        enumValues: ['info', 'warning', 'critical'],
      },
      { key: 'service', label: 'Service', type: 'string' },
      { key: 'message', label: 'Message', type: 'string' },
      { key: 'createdAt', label: 'Created At', type: 'datetime' },
      { key: 'resolved', label: 'Resolved', type: 'boolean' },
      { key: 'tags', label: 'Tags', type: 'array' },
    ],
  },
]

const statusCycle: EventStatus[] = ['ingested', 'warning', 'error', 'muted']
const sources: EventRecord['source'][] = [
  'api',
  'web',
  'mobile',
  'worker',
  'ingestion',
]

const buildPayload = (
  schemaId: EventSchema['id'],
  index: number,
): Record<string, unknown> => {
  switch (schemaId) {
    case 'user-signup':
      return {
        userId: `user-${1000 + index}`,
        email: `user${index}@example.com`,
        plan: ['free', 'pro', 'enterprise'][index % 3],
        marketingConsent: index % 2 === 0,
        signedUpAt: buildDate(index),
        referral: index % 4 === 0 ? 'campaign-2025' : 'organic',
      }
    case 'order-created':
      return {
        orderId: `ord-${5000 + index}`,
        amount: 40 + (index % 7) * 8,
        currency: ['USD', 'EUR', 'GBP', 'JPY'][index % 4],
        items: [`SKU-${(index % 5) + 1}`, `SKU-${(index % 7) + 2}`],
        shippingCountry: ['US', 'DE', 'GB', 'JP'][index % 4],
        placedAt: buildDate(index + 2),
        newCustomer: index % 3 !== 0,
      }
    case 'payment-failed':
      return {
        paymentId: `pay-${9000 + index}`,
        reason: [
          'card_declined',
          'insufficient_funds',
          'expired_card',
          'network_error',
        ][index % 4],
        retryable: index % 2 === 1,
        attempts: 1 + (index % 3),
        failureAt: buildDate(index + 4),
        region: ['us-east-1', 'eu-central-1', 'ap-southeast-1'][index % 3],
      }
    case 'session-started':
      return {
        sessionId: `sess-${7000 + index}`,
        device: ['ios', 'android', 'web', 'desktop'][index % 4],
        location: {
          country: ['US', 'CA', 'BR', 'IN', 'DE'][index % 5],
          city: ['NYC', 'Toronto', 'São Paulo', 'Bengaluru', 'Berlin'][
            index % 5
          ],
          lat: 40.7 + index * 0.01,
          lng: -73.9 + index * 0.01,
        },
        osVersion: ['17.2', '14.1', '15.0', '13.4'][index % 4],
        startedAt: buildDate(index + 1),
        returning: index % 2 === 0,
      }
    case 'system-alert':
      return {
        alertId: `alt-${3000 + index}`,
        severity: ['info', 'warning', 'critical'][index % 3],
        service: ['ingestion', 'api', 'webhook', 'jobs'][index % 4],
        message: [
          'Throughput spike detected',
          'Dead letter queue filling',
          'Increased error rate',
        ][index % 3],
        createdAt: buildDate(index + 3),
        resolved: index % 4 === 0,
        tags: ['ops', 'oncall', ...(index % 3 === 0 ? ['pager'] : [])],
      }
    default:
      return {}
  }
}

const createRecords = (
  schemaId: EventSchema['id'],
  count: number,
  start: number,
): EventRecord[] =>
  Array.from({ length: count }).map((_, idx) => {
    const globalIndex = start + idx
    return {
      id: `${schemaId}-${globalIndex}`,
      title: `${schemaId.replace(/-/g, ' ')} #${globalIndex}`,
      schemaId,
      source: sources[globalIndex % sources.length],
      status: statusCycle[globalIndex % statusCycle.length],
      createdAt: buildDate(globalIndex),
      payload: buildPayload(schemaId, globalIndex),
    }
  })

export const eventRecords: EventRecord[] = [
  ...createRecords('user-signup', 10, 1),
  ...createRecords('order-created', 10, 11),
  ...createRecords('payment-failed', 10, 21),
  ...createRecords('session-started', 10, 31),
  ...createRecords('system-alert', 10, 41),
]

export type EventRow = EventRecord & {
  schemaName: string
  schemaVersion: string
}
