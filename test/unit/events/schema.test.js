import { describe, beforeEach, test, expect } from 'vitest'
import schema from '../../../src/events/schema.js'
import { event as eventPayload } from '../../mocks/event.js'

let event

describe('audit event schema', () => {
  beforeEach(() => {
    event = structuredClone(eventPayload)
  })

  test('should validate a valid event', () => {
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with undefined user', () => {
    event.user = undefined
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with missing user', () => {
    delete event.user
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with empty user', () => {
    event.user = ''
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should not validate an event with null user', () => {
    event.user = null
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with user exceeding 50 characters', () => {
    event.user = 'A'.repeat(51)
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with undefined sessionid', () => {
    event.sessionid = undefined
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with null sessionid', () => {
    event.sessionid = null
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with missing sessionid', () => {
    delete event.sessionid
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with empty sessionid', () => {
    event.sessionid = ''
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with sessionid exceeding 50 characters', () => {
    event.sessionid = 'A'.repeat(51)
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with undefined correlationid', () => {
    event.correlationid = undefined
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with null correlationid', () => {
    event.correlationid = null
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with missing correlationid', () => {
    delete event.correlationid
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with empty correlationid', () => {
    event.correlationid = ''
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with correlationid exceeding 50 characters', () => {
    event.correlationid = 'A'.repeat(51)
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with undefined datetime', () => {
    event.datetime = undefined
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with null datetime', () => {
    event.datetime = null
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with missing datetime', () => {
    delete event.datetime
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with empty datetime', () => {
    event.datetime = ''
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with invalid datetime format', () => {
    event.datetime = 'not-a-date'
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should validate an event with valid ISO datetime', () => {
    event.datetime = '2025-12-01T12:51:41.381Z'
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should not validate an event with undefined environment', () => {
    event.environment = undefined
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with null environment', () => {
    event.environment = null
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with missing environment', () => {
    delete event.environment
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with empty environment', () => {
    event.environment = ''
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with environment exceeding 20 characters', () => {
    event.environment = 'A'.repeat(21)
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should convert environment to lowercase', () => {
    event.environment = 'PRODUCTION'
    const result = schema.validate(event)
    expect(result.error).toBeUndefined()
    expect(result.value.environment).toBe('production')
  })

  test('should convert mixed case environment to lowercase', () => {
    event.environment = 'DeVeLoPmEnT'
    const result = schema.validate(event)
    expect(result.error).toBeUndefined()
    expect(result.value.environment).toBe('development')
  })

  test('should not validate an event with undefined version', () => {
    event.version = undefined
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with null version', () => {
    event.version = null
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with missing version', () => {
    delete event.version
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with empty version', () => {
    event.version = ''
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with version exceeding 10 characters', () => {
    event.version = 'A'.repeat(11)
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with undefined application', () => {
    event.application = undefined
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with null application', () => {
    event.application = null
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with missing application', () => {
    delete event.application
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with empty application', () => {
    event.application = ''
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with application exceeding 10 characters', () => {
    event.application = 'A'.repeat(11)
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with undefined component', () => {
    event.component = undefined
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with null component', () => {
    event.component = null
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with missing component', () => {
    delete event.component
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with empty component', () => {
    event.component = ''
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with component exceeding 30 characters', () => {
    event.component = 'A'.repeat(31)
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should validate an event with undefined security', () => {
    event.security = undefined
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with null security when audit is present', () => {
    event.security = null
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with missing security', () => {
    delete event.security
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should not validate an event with undefined ip', () => {
    event.ip = undefined
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with null ip', () => {
    event.ip = null
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with missing ip', () => {
    delete event.ip
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with empty ip', () => {
    event.ip = ''
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with ip exceeding 20 characters', () => {
    event.ip = 'A'.repeat(21)
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with undefined security.pmcode', () => {
    event.security.pmcode = undefined
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with null security.pmcode', () => {
    event.security.pmcode = null
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with missing security.pmcode', () => {
    delete event.security.pmcode
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with empty security.pmcode', () => {
    event.security.pmcode = ''
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with security.pmcode exceeding 4 characters', () => {
    event.security.pmcode = 'A'.repeat(5)
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should strip dashes from security.pmcode', () => {
    event.security.pmcode = '12-34'
    const result = schema.validate(event)
    expect(result.error).toBeUndefined()
    expect(result.value.security.pmcode).toBe('1234')
  })

  test('should strip multiple dashes from security.pmcode', () => {
    event.security.pmcode = '1-2-3-4'
    const result = schema.validate(event)
    expect(result.error).toBeUndefined()
    expect(result.value.security.pmcode).toBe('1234')
  })

  test('should not validate an event with undefined security.priority', () => {
    event.security.priority = undefined
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with null security.priority', () => {
    event.security.priority = null
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with missing security.priority', () => {
    delete event.security.priority
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with non-integer security.priority', () => {
    event.security.priority = 'not-a-number'
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with decimal security.priority', () => {
    event.security.priority = 1.5
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should validate an event with valid integer security.priority', () => {
    event.security.priority = 5
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with security.priority as 0', () => {
    event.security.priority = 0
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with security.priority as 9', () => {
    event.security.priority = 9
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with undefined security.details', () => {
    event.security.details = undefined
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with missing security.details', () => {
    delete event.security.details
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with undefined security.details.transactioncode', () => {
    event.security.details.transactioncode = undefined
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with empty security.details.transactioncode', () => {
    event.security.details.transactioncode = ''
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should not validate an event with null security.details.transactioncode', () => {
    event.security.details.transactioncode = null
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with security.details.transactioncode exceeding 4 characters', () => {
    event.security.details.transactioncode = 'A'.repeat(5)
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should validate an event with undefined security.details.message', () => {
    event.security.details.message = undefined
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with empty security.details.message', () => {
    event.security.details.message = ''
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should not validate an event with null security.details.message', () => {
    event.security.details.message = null
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with security.details.message exceeding 120 characters', () => {
    event.security.details.message = 'A'.repeat(121)
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should validate an event with undefined security.details.additionalinfo', () => {
    event.security.details.additionalinfo = undefined
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with empty security.details.additionalinfo', () => {
    event.security.details.additionalinfo = ''
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should not validate an event with null security.details.additionalinfo', () => {
    event.security.details.additionalinfo = null
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with security.details.additionalinfo exceeding 120 characters', () => {
    event.security.details.additionalinfo = 'A'.repeat(121)
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should validate an event with undefined audit', () => {
    event.audit = undefined
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with missing audit', () => {
    delete event.audit
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with null audit when security is present', () => {
    event.audit = null
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with undefined audit.eventtype', () => {
    event.audit.eventtype = undefined
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with empty audit.eventtype', () => {
    event.audit.eventtype = ''
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should not validate an event with null audit.eventtype', () => {
    event.audit.eventtype = null
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with audit.eventtype exceeding 120 characters', () => {
    event.audit.eventtype = 'A'.repeat(121)
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should validate an event with undefined audit.action', () => {
    event.audit.action = undefined
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with empty audit.action', () => {
    event.audit.action = ''
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should not validate an event with null audit.action', () => {
    event.audit.action = null
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with audit.action exceeding 120 characters', () => {
    event.audit.action = 'A'.repeat(121)
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should validate an event with undefined audit.entity', () => {
    event.audit.entity = undefined
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with empty audit.entity', () => {
    event.audit.entity = ''
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should not validate an event with null audit.entity', () => {
    event.audit.entity = null
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with audit.entity exceeding 120 characters', () => {
    event.audit.entity = 'A'.repeat(121)
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should validate an event with undefined audit.entityid', () => {
    event.audit.entityid = undefined
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with empty audit.entityid', () => {
    event.audit.entityid = ''
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should not validate an event with null audit.entityid', () => {
    event.audit.entityid = null
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with audit.entityid exceeding 120 characters', () => {
    event.audit.entityid = 'A'.repeat(121)
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should validate an event with undefined audit.status', () => {
    event.audit.status = undefined
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with empty audit.status', () => {
    event.audit.status = ''
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should not validate an event with null audit.status', () => {
    event.audit.status = null
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with audit.status exceeding 120 characters', () => {
    event.audit.status = 'A'.repeat(121)
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should validate an event with undefined audit.details', () => {
    event.audit.details = undefined
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with missing audit.details', () => {
    delete event.audit.details
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with empty audit.details object', () => {
    event.audit.details = {}
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should not validate an event with null audit.details', () => {
    event.audit.details = null
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should validate an event with both audit and security', () => {
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with only audit', () => {
    delete event.security
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with only security', () => {
    delete event.audit
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should not validate an event with neither audit nor security', () => {
    delete event.audit
    delete event.security
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should not validate an event with both audit and security as null', () => {
    event.audit = null
    event.security = null
    expect(schema.validate(event).error).toBeDefined()
  })

  test('should validate an event with null audit and valid security', () => {
    event.audit = null
    expect(schema.validate(event).error).toBeUndefined()
  })

  test('should validate an event with null security and valid audit', () => {
    event.security = null
    expect(schema.validate(event).error).toBeUndefined()
  })
})
