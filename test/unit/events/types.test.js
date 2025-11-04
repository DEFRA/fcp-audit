import { describe, test, expect } from 'vitest'

import { getEventType, eventTypes } from '../../../src/events/types'

const { MESSAGE_EVENT, MESSAGE_EVENT_REJECTED } = eventTypes

describe('getEventType', () => {
  test('should return message rejected event type for validation failure events', () => {
    const eventType = getEventType('uk.gov.fcp.sfd.notification.failure.validation')
    expect(eventType).toBe(MESSAGE_EVENT_REJECTED)
  })

  test('should return message event type if event relates to Single Front Door Comms', () => {
    const eventType = getEventType('uk.gov.fcp.sfd.notification.event')
    expect(eventType).toBe(MESSAGE_EVENT)
  })

  test('should throw error for unknown event types', () => {
    expect(() => getEventType('unknown.event.type')).toThrow('Unknown event type: unknown.event.type')
  })
})
