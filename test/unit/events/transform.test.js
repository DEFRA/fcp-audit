import { describe, beforeEach, test, expect } from 'vitest'
import { transformEvent } from '../../../src/events/transform.js'
import { event as eventPayload } from '../../mocks/event.js'

let event

describe('transform event', () => {
  beforeEach(() => {
    event = structuredClone(eventPayload)
  })

  describe('transformEvent', () => {
    test('should return both auditEvent and socEvent when both audit and security are present', () => {
      const result = transformEvent(event)
      expect(result.auditEvent).toBeDefined()
      expect(result.socEvent).toBeDefined()
    })

    test('should return only auditEvent when audit is present and security is not', () => {
      delete event.security
      const result = transformEvent(event)
      expect(result.auditEvent).toBeDefined()
      expect(result.socEvent).toBeUndefined()
    })

    test('should return only socEvent when security is present and audit is not', () => {
      delete event.audit
      const result = transformEvent(event)
      expect(result.auditEvent).toBeUndefined()
      expect(result.socEvent).toBeDefined()
    })

    test('should return neither event when both audit and security are not present', () => {
      delete event.audit
      delete event.security
      const result = transformEvent(event)
      expect(result.auditEvent).toBeUndefined()
      expect(result.socEvent).toBeUndefined()
    })
  })

  describe('auditEvent', () => {
    test('should contain user property', () => {
      const result = transformEvent(event)
      expect(result.auditEvent.user).toBe(event.user)
    })

    test('should contain sessionid property', () => {
      const result = transformEvent(event)
      expect(result.auditEvent.sessionid).toBe(event.sessionid)
    })

    test('should contain datetime property', () => {
      const result = transformEvent(event)
      expect(result.auditEvent.datetime).toBe(event.datetime)
    })

    test('should contain environment property', () => {
      const result = transformEvent(event)
      expect(result.auditEvent.environment).toBe(event.environment)
    })

    test('should contain version property', () => {
      const result = transformEvent(event)
      expect(result.auditEvent.version).toBe(event.version)
    })

    test('should contain application property', () => {
      const result = transformEvent(event)
      expect(result.auditEvent.application).toBe(event.application)
    })

    test('should contain component property', () => {
      const result = transformEvent(event)
      expect(result.auditEvent.component).toBe(event.component)
    })

    test('should contain ip property', () => {
      const result = transformEvent(event)
      expect(result.auditEvent.ip).toBe(event.ip)
    })

    test('should contain audit property', () => {
      const result = transformEvent(event)
      expect(result.auditEvent.audit).toBeDefined()
      expect(result.auditEvent.audit).toEqual(event.audit)
    })

    test('should spread all audit properties correctly', () => {
      const result = transformEvent(event)
      expect(result.auditEvent.audit.eventtype).toBe(event.audit.eventtype)
      expect(result.auditEvent.audit.action).toBe(event.audit.action)
      expect(result.auditEvent.audit.entity).toBe(event.audit.entity)
      expect(result.auditEvent.audit.entityid).toBe(event.audit.entityid)
      expect(result.auditEvent.audit.status).toBe(event.audit.status)
      expect(result.auditEvent.audit.details).toEqual(event.audit.details)
    })

    test('should not contain correlationid property', () => {
      const result = transformEvent(event)
      expect(result.auditEvent.correlationid).toBeUndefined()
    })

    test('should not contain security properties', () => {
      const result = transformEvent(event)
      expect(result.auditEvent.pmcode).toBeUndefined()
      expect(result.auditEvent.priority).toBeUndefined()
      expect(result.auditEvent.details).toBeUndefined()
    })

    test('should only contain expected properties', () => {
      const result = transformEvent(event)
      const expectedKeys = ['user', 'sessionid', 'datetime', 'environment', 'version', 'application', 'component', 'ip', 'audit']
      expect(Object.keys(result.auditEvent)).toEqual(expectedKeys)
    })
  })

  describe('socEvent', () => {
    test('should contain user property', () => {
      const result = transformEvent(event)
      expect(result.socEvent.user).toBe(event.user)
    })

    test('should contain sessionid property', () => {
      const result = transformEvent(event)
      expect(result.socEvent.sessionid).toBe(event.sessionid)
    })

    test('should contain datetime property', () => {
      const result = transformEvent(event)
      expect(result.socEvent.datetime).toBe(event.datetime)
    })

    test('should contain environment property', () => {
      const result = transformEvent(event)
      expect(result.socEvent.environment).toBe(event.environment)
    })

    test('should contain version property', () => {
      const result = transformEvent(event)
      expect(result.socEvent.version).toBe(event.version)
    })

    test('should contain application property', () => {
      const result = transformEvent(event)
      expect(result.socEvent.application).toBe(event.application)
    })

    test('should contain component property', () => {
      const result = transformEvent(event)
      expect(result.socEvent.component).toBe(event.component)
    })

    test('should contain ip property', () => {
      const result = transformEvent(event)
      expect(result.socEvent.ip).toBe(event.ip)
    })

    test('should contain pmcode property', () => {
      const result = transformEvent(event)
      expect(result.socEvent.pmcode).toBe(event.security.pmcode)
    })

    test('should contain priority property', () => {
      const result = transformEvent(event)
      expect(result.socEvent.priority).toBe(event.security.priority)
    })

    test('should contain details property', () => {
      const result = transformEvent(event)
      expect(result.socEvent.details).toBeDefined()
      expect(result.socEvent.details).toEqual(event.security.details)
    })

    test('should spread all security details properties correctly', () => {
      const result = transformEvent(event)
      expect(result.socEvent.details.transactioncode).toBe(event.security.details.transactioncode)
      expect(result.socEvent.details.message).toBe(event.security.details.message)
      expect(result.socEvent.details.additionalinfo).toBe(event.security.details.additionalinfo)
    })

    test('should not contain correlationid property', () => {
      const result = transformEvent(event)
      expect(result.socEvent.correlationid).toBeUndefined()
    })

    test('should not contain audit property', () => {
      const result = transformEvent(event)
      expect(result.socEvent.audit).toBeUndefined()
    })

    test('should only contain expected properties', () => {
      const result = transformEvent(event)
      const expectedKeys = ['user', 'sessionid', 'datetime', 'environment', 'version', 'application', 'component', 'ip', 'pmcode', 'priority', 'details']
      expect(Object.keys(result.socEvent)).toEqual(expectedKeys)
    })
  })
})
