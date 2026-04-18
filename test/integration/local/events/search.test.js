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

  test('no conditions returns all inserted events', async () => {
    const result = await searchEvents({ conditions: [], page: 1, pageSize: 20 })

    expect(result.total).toBe(5)
    expect(result.events).toHaveLength(5)
  })

  test('eq operator matches exact application', async () => {
    const result = await searchEvents({ conditions: [{ field: 'application', operator: 'eq', value: 'OTHER' }], page: 1, pageSize: 20 })

    expect(result.total).toBe(1)
    expect(result.events[0].application).toBe('OTHER')
  })

  test('ne operator excludes matching events', async () => {
    const result = await searchEvents({ conditions: [{ field: 'application', operator: 'ne', value: 'OTHER' }], page: 1, pageSize: 20 })

    expect(result.total).toBe(4)
    expect(result.events.every(e => e.application !== 'OTHER')).toBe(true)
  })

  test('contains operator matches partial application', async () => {
    const result = await searchEvents({ conditions: [{ field: 'application', operator: 'contains', value: 'FCP' }], page: 1, pageSize: 20 })

    expect(result.total).toBe(4)
    expect(result.events.every(e => e.application.startsWith('FCP'))).toBe(true)
  })

  test('notContains operator excludes partial match', async () => {
    const result = await searchEvents({ conditions: [{ field: 'application', operator: 'notContains', value: 'FCP' }], page: 1, pageSize: 20 })

    expect(result.total).toBe(1)
    expect(result.events[0].application).toBe('OTHER')
  })

  test('gt operator on datetime returns events after threshold', async () => {
    const result = await searchEvents({ conditions: [{ field: 'datetime', operator: 'gt', value: '2025-03-31T23:59:59.999Z' }], page: 1, pageSize: 20 })

    expect(result.total).toBe(2)
    expect(result.events.every(e => new Date(e.datetime) > new Date('2025-03-31T23:59:59.999Z'))).toBe(true)
  })

  test('lt operator on datetime returns events before threshold', async () => {
    const result = await searchEvents({ conditions: [{ field: 'datetime', operator: 'lt', value: '2025-02-28T23:59:59.999Z' }], page: 1, pageSize: 20 })

    expect(result.total).toBe(2)
    expect(result.events.every(e => new Date(e.datetime) < new Date('2025-02-28T23:59:59.999Z'))).toBe(true)
  })

  test('entity sub-field conditions use elemMatch', async () => {
    const result = await searchEvents({
      conditions: [
        { field: 'audit.entities.entity', operator: 'eq', value: 'application' },
        { field: 'audit.entities.action', operator: 'eq', value: 'created' }
      ],
      page: 1,
      pageSize: 20
    })

    expect(result.total).toBe(1)
    expect(result.events[0].audit.entities[0].entity).toBe('application')
    expect(result.events[0].audit.entities[0].action).toBe('created')
  })

  test('entity entityid condition returns correct event', async () => {
    const result = await searchEvents({ conditions: [{ field: 'audit.entities.entityid', operator: 'eq', value: 'PAY-005' }], page: 1, pageSize: 20 })

    expect(result.total).toBe(1)
    expect(result.events[0].audit.entities[0].entityid).toBe('PAY-005')
  })

  test('details custom property condition', async () => {
    const result = await searchEvents({ conditions: [{ field: 'details.specialField', operator: 'eq', value: 'uniqueValue' }], page: 1, pageSize: 20 })

    expect(result.total).toBe(1)
    expect(result.events[0].audit.details.specialField).toBe('uniqueValue')
  })

  test('details custom property contains operator', async () => {
    const result = await searchEvents({ conditions: [{ field: 'details.customKey', operator: 'contains', value: 'alph' }], page: 1, pageSize: 20 })

    expect(result.total).toBe(1)
    expect(result.events[0].audit.details.customKey).toBe('alpha')
  })

  test('audit.status field condition', async () => {
    const result = await searchEvents({ conditions: [{ field: 'audit.status', operator: 'eq', value: 'failure' }], page: 1, pageSize: 20 })

    expect(result.total).toBe(1)
    expect(result.events[0].audit.status).toBe('failure')
  })

  test('multiple conditions combine as AND', async () => {
    const result = await searchEvents({
      conditions: [
        { field: 'application', operator: 'eq', value: 'FCP002' },
        { field: 'component', operator: 'eq', value: 'fcp-audit' }
      ],
      page: 1,
      pageSize: 20
    })

    expect(result.total).toBe(1)
    expect(result.events[0].application).toBe('FCP002')
    expect(result.events[0].component).toBe('fcp-audit')
  })

  test('datetime range using two conditions', async () => {
    const result = await searchEvents({
      conditions: [
        { field: 'datetime', operator: 'gt', value: '2025-01-31T23:59:59.999Z' },
        { field: 'datetime', operator: 'lt', value: '2025-03-31T23:59:59.999Z' }
      ],
      page: 1,
      pageSize: 20
    })

    expect(result.total).toBe(2)
    expect(result.events.every(e => {
      const d = new Date(e.datetime)
      return d > new Date('2025-01-31T23:59:59.999Z') && d < new Date('2025-03-31T23:59:59.999Z')
    })).toBe(true)
  })

  test('pagination page 2 with pageSize 2 returns 2 events but total is 4', async () => {
    const result = await searchEvents({ conditions: [{ field: 'application', operator: 'contains', value: 'FCP' }], page: 2, pageSize: 2 })

    expect(result.total).toBe(4)
    expect(result.events).toHaveLength(2)
  })

  test('condition with empty value is skipped', async () => {
    const result = await searchEvents({ conditions: [{ field: 'application', operator: 'eq', value: '' }], page: 1, pageSize: 20 })

    expect(result.total).toBe(5)
  })
})
