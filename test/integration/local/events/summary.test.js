import { describe, beforeEach, beforeAll, afterAll, test, expect } from 'vitest'
import { createMongoDbConnection, closeMongoDbConnection, getMongoDb } from '../../../../src/common/helpers/mongodb.js'
import { config } from '../../../../src/config/config.js'
import { getSummary } from '../../../../src/events/summary.js'
import { clearAllCollections } from '../../../helpers/mongo.js'

let collections

describe('getSummary', () => {
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

  test('empty collection returns total 0 and empty applications', async () => {
    const result = await getSummary()

    expect(result.total).toBe(0)
    expect(result.applications).toEqual([])
  })

  test('single event returns total 1 with correct application and component', async () => {
    await collections.audit.insertMany([
      { application: 'FCP001', component: 'fcp-audit', received: new Date() }
    ])

    const result = await getSummary()

    expect(result.total).toBe(1)
    expect(result.applications).toHaveLength(1)
    expect(result.applications[0].application).toBe('FCP001')
    expect(result.applications[0].total).toBe(1)
    expect(result.applications[0].components).toHaveLength(1)
    expect(result.applications[0].components[0].component).toBe('fcp-audit')
    expect(result.applications[0].components[0].total).toBe(1)
  })

  test('two events same application same component returns total 2 with single component entry', async () => {
    await collections.audit.insertMany([
      { application: 'FCP001', component: 'fcp-audit', received: new Date() },
      { application: 'FCP001', component: 'fcp-audit', received: new Date() }
    ])

    const result = await getSummary()

    expect(result.total).toBe(2)
    expect(result.applications).toHaveLength(1)
    expect(result.applications[0].application).toBe('FCP001')
    expect(result.applications[0].total).toBe(2)
    expect(result.applications[0].components).toHaveLength(1)
    expect(result.applications[0].components[0].total).toBe(2)
  })

  test('two events same application different components returns two component entries', async () => {
    await collections.audit.insertMany([
      { application: 'FCP001', component: 'fcp-audit', received: new Date() },
      { application: 'FCP001', component: 'fcp-portal', received: new Date() }
    ])

    const result = await getSummary()

    expect(result.total).toBe(2)
    expect(result.applications).toHaveLength(1)
    expect(result.applications[0].application).toBe('FCP001')
    expect(result.applications[0].total).toBe(2)
    expect(result.applications[0].components).toHaveLength(2)
    expect(result.applications[0].components.every(c => c.total === 1)).toBe(true)
  })

  test('two events different applications returns two application entries each with total 1', async () => {
    await collections.audit.insertMany([
      { application: 'FCP001', component: 'fcp-audit', received: new Date() },
      { application: 'FCP002', component: 'fcp-portal', received: new Date() }
    ])

    const result = await getSummary()

    expect(result.total).toBe(2)
    expect(result.applications).toHaveLength(2)
    expect(result.applications[0].total).toBe(1)
    expect(result.applications[1].total).toBe(1)
  })

  test('applications are sorted alphabetically', async () => {
    await collections.audit.insertMany([
      { application: 'ZZZ', component: 'fcp-audit', received: new Date() },
      { application: 'AAA', component: 'fcp-audit', received: new Date() }
    ])

    const result = await getSummary()

    expect(result.applications[0].application).toBe('AAA')
    expect(result.applications[1].application).toBe('ZZZ')
  })
})
