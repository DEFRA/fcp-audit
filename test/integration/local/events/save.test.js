import { describe, beforeEach, beforeAll, afterAll, test, expect } from 'vitest'
import { createMongoDbConnection, closeMongoDbConnection, getMongoDb } from '../../../../src/common/helpers/mongodb.js'
import { config } from '../../../../src/config/config.js'
import { saveEvent, generateAuditId } from '../../../../src/events/save.js'
import { clearAllCollections } from '../../../helpers/mongo.js'
import { auditEvent as auditEventPayload } from '../../../mocks/event.js'

const auditEvent = structuredClone(auditEventPayload)

const auditEvent2 = structuredClone({
  ...auditEventPayload,
  user: 'IDM/9c8d7c1b-5fb3-f922-b082-111e4b39e2b1',
  sessionid: 'f77e89g6-b69e-57g7-b0c5-g9d91f00c7ed',
  datetime: '2025-12-01T13:51:41.381Z',
  ip: '192.168.1.101',
  audit: {
    ...auditEventPayload.audit,
    eventtype: 'UserLogout',
    action: 'LOGOUT',
    entity: 'UserSession',
    entityid: 'SES-89389915',
    details: {
      caseid: 'CRM-09384722'
    }
  }
})

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
    expect(savedEvent.user).toBe(auditEvent.user)
    expect(savedEvent.sessionid).toBe(auditEvent.sessionid)
    expect(savedEvent.datetime).toBe(auditEvent.datetime)
    expect(savedEvent.ip).toBe(auditEvent.ip)
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

  test('should save audit metadata fields', async () => {
    await saveEvent(auditEvent)

    const expectedId = generateAuditId(auditEvent)
    const savedEvent = await collections.audit.findOne({ _id: expectedId })

    expect(savedEvent).toBeDefined()
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
    expect(savedEvent1.user).toBe(auditEvent.user)

    expect(savedEvent2).toBeDefined()
    expect(savedEvent2.user).toBe(auditEvent2.user)

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
