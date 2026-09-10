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

  test('generates the expected full id for the mock audit event', () => {
    const id = generateAuditId(auditEvent)
    const decoded = Buffer.from(id, 'base64').toString('utf-8')

    expect(decoded).toBe('FCP001|fcp-audit|79389915-7275-457a-b8ca-8bf206b2e67b|e66d78f5-a58d-46f6-a9b4-f8c90e99b6dc|2025-12-01T12:51:41.381Z|192.168.1.100')
  })

  test('uses an empty string for a null or undefined sessionid', () => {
    const nullId = generateAuditId({ ...auditEvent, sessionid: null })
    const undefinedId = generateAuditId({ ...auditEvent, sessionid: undefined })
    const decoded = Buffer.from(nullId, 'base64').toString('utf-8')

    expect(nullId).toBe(undefinedId)
    expect(decoded).not.toContain('null')
    expect(decoded).not.toContain('undefined')

    const fields = decoded.split('|')
    expect(fields).toHaveLength(6)
    // Session id field
    expect(fields[3]).toBe('')
  })
})
