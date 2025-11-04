import * as events from '../mocks/events.js'

export const singleEvents = {
  messageRequest: [events.messageRequest],
  validationFailure: [events.validationFailure],
  statusSending: [events.statusSending],
  statusDelivered: [events.statusDelivered],
  statusProviderFailure: [events.statusProviderFailure],
  statusInternalFailure: [events.statusInternalFailure],
  messageRetryRequest: [events.messageRetryRequest],
  statusRetryExpired: [events.statusRetryExpired]
}

export const completeStreams = {
  /**
   * Happy Path: Message request → Sending → Delivered
   */
  successful: [
    events.messageRequest,
    events.statusSending,
    events.statusDelivered
  ],

  /**
   * Validation Failure Path: Message request fails validation immediately
   */
  validationFailure: [
    events.messageRequest,
    events.validationFailure
  ],

  /**
   * Provider Failure Path: Message request → Sending → Provider failure
   */
  providerFailure: [
    events.messageRequest,
    events.statusSending,
    events.statusProviderFailure
  ],

  /**
   * Internal Failure Path: Message request → Internal failure
   */
  internalFailure: [
    events.messageRequest,
    events.statusInternalFailure
  ],

  /**
   * Retry Success Path: Message request → Internal failure → Retry → Sending → Delivered
   */
  retrySuccess: [
    events.messageRequest,
    events.statusInternalFailure,
    events.messageRetryRequest,
    events.statusSending,
    events.statusDelivered
  ],

  /**
   * Retry Failure Path: Message request → Failure → Retry → Failure → Retry expired
   */
  retryFailure: [
    events.messageRequest,
    events.statusInternalFailure,
    events.messageRetryRequest,
    { ...events.statusInternalFailure, id: '550e8400-e29b-41d4-a716-446655440099', time: '2023-10-17T14:52:00.000Z' },
    events.statusRetryExpired
  ]
}

export const scenarios = {
  single: singleEvents,
  streams: completeStreams
}

export function getScenario (path) {
  const parts = path.split('.')
  let current = scenarios

  for (const part of parts) {
    if (current[part]) {
      current = current[part]
    } else {
      throw new Error(`Scenario not found: ${path}`)
    }
  }

  return current
}

export function listScenarios () {
  const list = []

  function traverse (obj, path = '') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key
      if (Array.isArray(value)) {
        list.push({
          path: currentPath,
          count: value.length
        })
      } else if (typeof value === 'object') {
        traverse(value, currentPath)
      } else {
        list.push({
          path: currentPath,
          count: 1
        })
      }
    }
  }

  traverse(scenarios)
  return list
}
