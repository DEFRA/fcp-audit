import { describe, beforeEach, beforeAll, afterAll, test, expect } from 'vitest'
import { createMongoDbConnection, closeMongoDbConnection, getMongoDb } from '../../../../src/common/helpers/mongodb.js'
import { config } from '../../../../src/config/config.js'
import { getEvents } from '../../../../src/events/get.js'
import { clearAllCollections } from '../../../helpers/mongo.js'

const testAuditEvents = [{
  _id: 'event-id-1',
  user: 'IDM/user-1',
  sessionid: 'session-1',
  datetime: '2024-01-01T10:00:00.000Z',
  environment: 'prod',
  version: '1.2',
  application: 'FCP001',
  component: 'fcp-audit',
  ip: '192.168.1.100',
  audit: {
    eventtype: 'Login',
    action: 'USER_LOGIN',
    entity: 'User',
    entityid: 'USR-001',
    status: 'SUCCESS',
    details: { method: 'password' }
  },
  received: new Date('2024-01-01T10:00:01.000Z')
}, {
  _id: 'event-id-2',
  user: 'IDM/user-2',
  sessionid: 'session-2',
  datetime: '2024-01-01T11:00:00.000Z',
  environment: 'prod',
  version: '1.2',
  application: 'FCP001',
  component: 'fcp-audit',
  ip: '192.168.1.101',
  audit: {
    eventtype: 'DataAccess',
    action: 'VIEW_RECORD',
    entity: 'Record',
    entityid: 'REC-002',
    status: 'SUCCESS',
    details: { recordType: 'application' }
  },
  received: new Date('2024-01-01T11:00:01.000Z')
}, {
  _id: 'event-id-3',
  user: 'IDM/user-1',
  sessionid: 'session-3',
  datetime: '2024-01-01T12:00:00.000Z',
  environment: 'staging',
  version: '1.2',
  application: 'FCP002',
  component: 'fcp-portal',
  ip: '192.168.1.100',
  audit: {
    eventtype: 'DataUpdate',
    action: 'UPDATE_RECORD',
    entity: 'Record',
    entityid: 'REC-003',
    status: 'FAILURE',
    details: { reason: 'validation_error' }
  },
  received: new Date('2024-01-01T12:00:01.000Z')
}, {
  _id: 'event-id-4',
  user: 'IDM/user-3',
  sessionid: 'session-4',
  datetime: '2024-01-01T13:00:00.000Z',
  environment: 'prod',
  version: '1.2',
  application: 'FCP001',
  component: 'fcp-audit',
  ip: '192.168.1.102',
  audit: {
    eventtype: 'Logout',
    action: 'USER_LOGOUT',
    entity: 'User',
    entityid: 'USR-003',
    status: 'SUCCESS',
    details: { sessionDuration: 3600 }
  },
  received: new Date('2024-01-01T13:00:01.000Z')
}]

let collections

beforeAll(async () => {
  await createMongoDbConnection(config.get('mongo'))

  const mongoDb = getMongoDb()
  collections = mongoDb.collections
})

beforeEach(async () => {
  await clearAllCollections(collections)
  await collections.audit.insertMany(testAuditEvents)
})

afterAll(async () => {
  await closeMongoDbConnection()
})

describe('getEvents', () => {
  test('should retrieve all audit events', async () => {
    const { events } = await getEvents({ page: 1, pageSize: 10 })
    expect(events).toHaveLength(4)
    expect(events).toEqual(expect.arrayContaining(testAuditEvents))
  })

  test('should return events in descending order of received timestamp by default', async () => {
    const { events } = await getEvents({ page: 1, pageSize: 10 })
    const sorted = [...events].sort((a, b) => b.received - a.received)
    expect(events).toEqual(sorted)
  })

  test('should explicitly order events by received descending', async () => {
    const { events } = await getEvents({ page: 1, pageSize: 10 })
    for (let i = 0; i < events.length - 1; i++) {
      expect(events[i].received >= events[i + 1].received).toBe(true)
    }
  })

  test('should return only the first page of results with custom pageSize (received desc)', async () => {
    const sorted = [...testAuditEvents].sort((a, b) => b.received - a.received)
    const { events } = await getEvents({ page: 1, pageSize: 2 })
    expect(events).toEqual([sorted[0], sorted[1]])
    expect(events).toHaveLength(2)
  })

  test('should return the second page of results with custom pageSize (received desc)', async () => {
    const sorted = [...testAuditEvents].sort((a, b) => b.received - a.received)
    const { events } = await getEvents({ page: 2, pageSize: 2 })
    expect(events).toEqual([sorted[2], sorted[3]])
    expect(events).toHaveLength(2)
  })

  test('should return the third page of results with custom pageSize (received desc)', async () => {
    const { events } = await getEvents({ page: 3, pageSize: 2 })
    expect(events).toEqual([])
    expect(events).toHaveLength(0)
  })

  test('should handle page size of 1', async () => {
    const sorted = [...testAuditEvents].sort((a, b) => b.received - a.received)
    const { events } = await getEvents({ page: 1, pageSize: 1 })
    expect(events).toEqual([sorted[0]])
    expect(events).toHaveLength(1)
  })

  test('should return correct events for second page with page size of 1', async () => {
    const sorted = [...testAuditEvents].sort((a, b) => b.received - a.received)
    const { events } = await getEvents({ page: 2, pageSize: 1 })
    expect(events).toEqual([sorted[1]])
    expect(events).toHaveLength(1)
  })

  test('should handle page size larger than total events', async () => {
    const { events } = await getEvents({ page: 1, pageSize: 100 })
    expect(events).toHaveLength(4)
  })

  test('should return empty array for page beyond available data', async () => {
    const { events } = await getEvents({ page: 10, pageSize: 10 })
    expect(events).toEqual([])
    expect(events).toHaveLength(0)
  })

  test('should return all events on page 1 with default pageSize', async () => {
    const { events } = await getEvents({ page: 1, pageSize: 20 })
    expect(events).toHaveLength(4)
  })

  test('should return correct events for middle page', async () => {
    const sorted = [...testAuditEvents].sort((a, b) => b.received - a.received)
    const { events } = await getEvents({ page: 3, pageSize: 1 })
    expect(events).toEqual([sorted[2]])
    expect(events).toHaveLength(1)
  })

  test('should preserve all event properties including _id', async () => {
    const { events } = await getEvents({ page: 1, pageSize: 1 })
    const event = events[0]
    expect(event._id).toBeDefined()
    expect(event.user).toBeDefined()
    expect(event.sessionid).toBeDefined()
    expect(event.datetime).toBeDefined()
    expect(event.environment).toBeDefined()
    expect(event.version).toBeDefined()
    expect(event.application).toBeDefined()
    expect(event.component).toBeDefined()
    expect(event.ip).toBeDefined()
    expect(event.audit).toBeDefined()
    expect(event.received).toBeDefined()
  })

  test('should preserve audit nested properties', async () => {
    const { events } = await getEvents({ page: 1, pageSize: 1 })
    const event = events[0]
    expect(event.audit.eventtype).toBeDefined()
    expect(event.audit.action).toBeDefined()
    expect(event.audit.entity).toBeDefined()
    expect(event.audit.entityid).toBeDefined()
    expect(event.audit.status).toBeDefined()
    expect(event.audit.details).toBeDefined()
  })

  test('should return empty array when no events exist', async () => {
    await clearAllCollections(collections)
    const { events } = await getEvents({ page: 1, pageSize: 10 })
    expect(events).toEqual([])
    expect(events).toHaveLength(0)
  })

  test('should handle single event in collection', async () => {
    await clearAllCollections(collections)
    await collections.audit.insertOne(testAuditEvents[0])
    const { events } = await getEvents({ page: 1, pageSize: 10 })
    expect(events).toEqual([testAuditEvents[0]])
    expect(events).toHaveLength(1)
  })

  test('should correctly skip events for page 2', async () => {
    const sorted = [...testAuditEvents].sort((a, b) => b.received - a.received)
    const { events } = await getEvents({ page: 2, pageSize: 3 })
    expect(events).toEqual([sorted[3]])
    expect(events).toHaveLength(1)
  })

  test('should return consistent results for repeated calls with same parameters', async () => {
    const result1 = await getEvents({ page: 1, pageSize: 2 })
    const result2 = await getEvents({ page: 1, pageSize: 2 })
    expect(result1.events).toEqual(result2.events)
  })
})
