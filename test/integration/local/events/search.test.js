import { describe, beforeEach, beforeAll, afterAll, test, expect } from 'vitest'
import { createMongoDbConnection, closeMongoDbConnection, getMongoDb } from '../../../../src/common/helpers/mongodb.js'
import { config } from '../../../../src/config/config.js'
import { searchEvents } from '../../../../src/events/search.js'
import { clearAllCollections } from '../../../helpers/mongo.js'
import { auditEvent as auditEventBase } from '../../../mocks/event.js'

let collections

const seedEvents = [
  structuredClone({
    ...auditEventBase,
    application: 'FCP001',
    component: 'fcp-audit',
    datetime: new Date('2025-01-01T10:00:00.000Z'),
    ip: '10.0.0.1',
    audit: {
      ...auditEventBase.audit,
      entities: [{ entity: 'application', action: 'created', entityid: 'APP-001' }],
      accounts: { sbi: '111111111' },
      status: 'success',
      details: { caseid: 'CRM-001', customKey: 'alpha' }
    }
  }),
  structuredClone({
    ...auditEventBase,
    application: 'FCP001',
    component: 'fcp-portal',
    datetime: new Date('2025-02-01T10:00:00.000Z'),
    ip: '10.0.0.2',
    audit: {
      ...auditEventBase.audit,
      entities: [{ entity: 'person', action: 'updated', entityid: 'USR-002' }],
      accounts: { sbi: '222222222' },
      status: 'failure',
      details: { caseid: 'CRM-002' }
    }
  }),
  structuredClone({
    ...auditEventBase,
    application: 'FCP002',
    component: 'fcp-audit',
    datetime: new Date('2025-03-01T10:00:00.000Z'),
    ip: '10.0.0.3',
    audit: {
      ...auditEventBase.audit,
      entities: [{ entity: 'record', action: 'deleted', entityid: 'REC-003' }],
      accounts: { sbi: '333333333' },
      status: 'success',
      details: { caseid: 'CRM-003' }
    }
  }),
  structuredClone({
    ...auditEventBase,
    application: 'OTHER',
    component: 'other-service',
    datetime: new Date('2025-04-01T10:00:00.000Z'),
    ip: '10.0.0.4',
    audit: {
      ...auditEventBase.audit,
      entities: [{ entity: 'document', action: 'viewed', entityid: 'DOC-004' }],
      accounts: { sbi: '444444444' },
      status: 'success',
      details: { caseid: 'CRM-004', specialField: 'uniqueValue' }
    }
  }),
  structuredClone({
    ...auditEventBase,
    application: 'FCP002',
    component: 'fcp-portal',
    datetime: new Date('2025-05-01T10:00:00.000Z'),
    ip: '10.0.0.5',
    audit: {
      ...auditEventBase.audit,
      entities: [{ entity: 'payment', action: 'approved', entityid: 'PAY-005' }],
      accounts: { sbi: '555555555' },
      status: 'pending',
      details: { caseid: 'CRM-005' }
    }
  })
]

describe('searchEvents', () => {
  beforeAll(async () => {
    await createMongoDbConnection(config.get('mongo'))

    const mongoDb = getMongoDb()
    collections = mongoDb.collections

    await clearAllCollections(collections)
    await collections.audit.insertMany(seedEvents.map((e, i) => ({ ...e, received: new Date(2025, i, 1) })))
  })

  beforeEach(async () => {
    // no per-test teardown; seed is shared and read-only per test
  })

  afterAll(async () => {
    await closeMongoDbConnection()
  })

  test('no filters returns all inserted events', async () => {
    const result = await searchEvents({ filters: {}, page: 1, pageSize: 20 })

    expect(result.total).toBe(5)
    expect(result.events).toHaveLength(5)
  })

  test('filter by application exact match', async () => {
    const result = await searchEvents({ filters: { application: 'OTHER' }, page: 1, pageSize: 20 })

    expect(result.total).toBe(1)
    expect(result.events[0].application).toBe('OTHER')
  })

  test('filter by application partial match', async () => {
    const result = await searchEvents({ filters: { application: 'FCP' }, page: 1, pageSize: 20 })

    expect(result.total).toBe(4)
    expect(result.events.every(e => e.application.startsWith('FCP'))).toBe(true)
  })

  test('filter by component', async () => {
    const result = await searchEvents({ filters: { component: 'fcp-audit' }, page: 1, pageSize: 20 })

    expect(result.total).toBe(2)
    expect(result.events.every(e => e.component === 'fcp-audit')).toBe(true)
  })

  test('filter by auditStatus', async () => {
    const result = await searchEvents({ filters: { auditStatus: 'failure' }, page: 1, pageSize: 20 })

    expect(result.total).toBe(1)
    expect(result.events[0].audit.status).toBe('failure')
  })

  test('filter by entityAction', async () => {
    const result = await searchEvents({ filters: { entityAction: 'created' }, page: 1, pageSize: 20 })

    expect(result.total).toBe(1)
    expect(result.events[0].audit.entities[0].action).toBe('created')
  })

  test('filter by entityEntity', async () => {
    const result = await searchEvents({ filters: { entityEntity: 'person' }, page: 1, pageSize: 20 })

    expect(result.total).toBe(1)
    expect(result.events[0].audit.entities[0].entity).toBe('person')
  })

  test('filter by customField and customValue', async () => {
    const result = await searchEvents({ filters: { customField: 'specialField', customValue: 'uniqueValue' }, page: 1, pageSize: 20 })

    expect(result.total).toBe(1)
    expect(result.events[0].audit.details.specialField).toBe('uniqueValue')
  })

  test('filter by dateFrom only', async () => {
    const result = await searchEvents({ filters: { dateFrom: '2025-04-01T00:00:00.000Z' }, page: 1, pageSize: 20 })

    expect(result.total).toBe(2)
    expect(result.events.every(e => new Date(e.datetime) >= new Date('2025-04-01T00:00:00.000Z'))).toBe(true)
  })

  test('filter by dateTo only', async () => {
    const result = await searchEvents({ filters: { dateTo: '2025-02-28T23:59:59.999Z' }, page: 1, pageSize: 20 })

    expect(result.total).toBe(2)
    expect(result.events.every(e => new Date(e.datetime) <= new Date('2025-02-28T23:59:59.999Z'))).toBe(true)
  })

  test('filter by dateFrom and dateTo combined', async () => {
    const result = await searchEvents({
      filters: {
        dateFrom: '2025-02-01T00:00:00.000Z',
        dateTo: '2025-03-31T23:59:59.999Z'
      },
      page: 1,
      pageSize: 20
    })

    expect(result.total).toBe(2)
    expect(result.events.every(e => {
      const d = new Date(e.datetime)
      return d >= new Date('2025-02-01T00:00:00.000Z') && d <= new Date('2025-03-31T23:59:59.999Z')
    })).toBe(true)
  })

  test('multiple filters combined', async () => {
    const result = await searchEvents({
      filters: { application: 'FCP002', component: 'fcp-audit' },
      page: 1,
      pageSize: 20
    })

    expect(result.total).toBe(1)
    expect(result.events[0].application).toBe('FCP002')
    expect(result.events[0].component).toBe('fcp-audit')
  })

  test('pagination page 2 with pageSize 2 returns 2 events but total is 4', async () => {
    const result = await searchEvents({ filters: { application: 'FCP' }, page: 2, pageSize: 2 })

    expect(result.total).toBe(4)
    expect(result.events).toHaveLength(2)
  })
})
