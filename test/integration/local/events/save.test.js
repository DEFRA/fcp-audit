import { describe, beforeEach, beforeAll, afterAll, test, expect } from 'vitest'
import { createMongoDbConnection, closeMongoDbConnection, getMongoDb } from '../../../../src/common/helpers/mongodb.js'
import { config } from '../../../../src/config/config.js'
import { saveEvent, generateAuditId } from '../../../../src/events/audit.js'
import { clearAllCollections } from '../../../helpers/mongo.js'

const auditEvent = {
  eventType: 'uk.gov.defra.fcp.user.login',
  timestamp: '2025-11-17T10:00:00.000Z',
  userId: 'user123',
  sourceIp: '192.168.1.1',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  correlationId: '79389915-7275-457a-b8ca-8bf206b2e67b',
  security: {
    authType: 'oauth2'
  },
  audit: {
    action: 'login',
    resource: 'portal'
  }
}

const auditEvent2 = {
  eventType: 'uk.gov.defra.fcp.user.logout',
  timestamp: '2025-11-17T11:00:00.000Z',
  userId: 'user456',
  sourceIp: '192.168.1.2',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  correlationId: '89389915-8385-567a-c9db-9cf307c3f68c',
  security: {
    authType: 'oauth2'
  },
  audit: {
    action: 'logout',
    resource: 'portal'
  }
}

let collections

describe('saveEvent', () => {
  beforeAll(async () => {
    await createMongoDbConnection(config.get('mongo'))

    const mongoDb = getMongoDb()
    collections = mongoDb.collections
  })

  beforeEach(async () => {
    await clearAllCollections(collections)
  })

  afterAll(async () => {
    await closeMongoDbConnection()
  })

  test('should save audit event to audit collection with composite _id', async () => {
    await saveEvent(auditEvent)

    const expectedId = generateAuditId(auditEvent)
    const savedEvent = await collections.audit.findOne({ _id: expectedId })

    expect(savedEvent).toBeDefined()
    expect(savedEvent.eventType).toBe(auditEvent.eventType)
    expect(savedEvent.userId).toBe(auditEvent.userId)
    expect(savedEvent.sourceIp).toBe(auditEvent.sourceIp)
    expect(savedEvent.userAgent).toBe(auditEvent.userAgent)
    expect(savedEvent.correlationId).toBe(auditEvent.correlationId)
  })

  test('should add received timestamp to saved audit event', async () => {
    const beforeSave = new Date()
    await saveEvent(auditEvent)
    const afterSave = new Date()

    const expectedId = generateAuditId(auditEvent)
    const savedEvent = await collections.audit.findOne({ _id: expectedId })

    expect(savedEvent).toBeDefined()
    expect(savedEvent.received).toBeDefined()
    expect(savedEvent.received).toBeInstanceOf(Date)
    expect(savedEvent.received.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime())
    expect(savedEvent.received.getTime()).toBeLessThanOrEqual(afterSave.getTime())
  })

  test('should save security and audit metadata fields', async () => {
    await saveEvent(auditEvent)

    const expectedId = generateAuditId(auditEvent)
    const savedEvent = await collections.audit.findOne({ _id: expectedId })

    expect(savedEvent).toBeDefined()
    expect(savedEvent.security).toEqual(auditEvent.security)
    expect(savedEvent.audit).toEqual(auditEvent.audit)
  })

  test('should not update existing audit event if duplicate event with same composite key', async () => {
    await saveEvent(auditEvent)

    // Attempt to save duplicate event with modified data
    const duplicateEvent = {
      ...auditEvent,
      audit: {
        action: 'modified',
        resource: 'modified'
      }
    }

    await saveEvent(duplicateEvent)

    const expectedId = generateAuditId(auditEvent)
    const eventsCount = await collections.audit.countDocuments({ _id: expectedId })
    expect(eventsCount).toBe(1)

    const savedEvent = await collections.audit.findOne({ _id: expectedId })
    // Should keep original data
    expect(savedEvent.audit).toEqual(auditEvent.audit)
  })

  test('should save multiple different audit events', async () => {
    await saveEvent(auditEvent)
    await saveEvent(auditEvent2)

    const expectedId1 = generateAuditId(auditEvent)
    const expectedId2 = generateAuditId(auditEvent2)

    const savedEvent1 = await collections.audit.findOne({ _id: expectedId1 })
    const savedEvent2 = await collections.audit.findOne({ _id: expectedId2 })

    expect(savedEvent1).toBeDefined()
    expect(savedEvent1.userId).toBe(auditEvent.userId)

    expect(savedEvent2).toBeDefined()
    expect(savedEvent2.userId).toBe(auditEvent2.userId)

    const totalCount = await collections.audit.countDocuments({})
    expect(totalCount).toBe(2)
  })

  test('should generate unique _id based on composite key fields', () => {
    const id1 = generateAuditId(auditEvent)
    const id2 = generateAuditId(auditEvent2)

    expect(id1).toBeDefined()
    expect(id2).toBeDefined()
    expect(id1).not.toBe(id2)

    // Same event should generate same ID
    const id1Duplicate = generateAuditId(auditEvent)
    expect(id1).toBe(id1Duplicate)
  })
})
