import { describe, test, expect } from 'vitest'
import { generateAuditId } from '../../../src/events/save.js'
import { auditEvent as auditEventPayload } from '../../mocks/event.js'

describe('generateAuditId', () => {
  const auditEvent = structuredClone(auditEventPayload)

  test('generates the same id for a datetime string and the equivalent Date object', () => {
    const stringId = generateAuditId(auditEvent)
    const dateId = generateAuditId({ ...auditEvent, datetime: new Date(auditEvent.datetime) })

    expect(dateId).toBe(stringId)
  })

  test('normalises the datetime segment to ISO 8601 regardless of input type', () => {
    const id = generateAuditId({ ...auditEvent, datetime: new Date(auditEvent.datetime) })
    const decoded = Buffer.from(id, 'base64').toString('utf-8')

    expect(decoded).toContain('|2025-12-01T12:51:41.381Z|')
  })
})
