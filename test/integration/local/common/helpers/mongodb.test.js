import { describe, beforeAll, afterAll, beforeEach, afterEach, test, expect } from 'vitest'
import { createMongoDbConnection, closeMongoDbConnection, getMongoDb, configureGlobalTtlIndexes } from '../../../../../src/common/helpers/mongodb.js'
import { config } from '../../../../../src/config/config.js'

const AUDIT_COLLECTION_NAME = 'audit'
const TTL_INDEX_NAME = 'events_ttl'

let db

beforeAll(async () => {
  await createMongoDbConnection(config.get('mongo'))
  db = getMongoDb().db
})

afterAll(async () => {
  await closeMongoDbConnection()
})

afterEach(async () => {
  const collections = await db.listCollections({ name: AUDIT_COLLECTION_NAME }).toArray()
  if (collections.length > 0) {
    const indexes = await db.collection(AUDIT_COLLECTION_NAME).indexes()
    if (indexes.some(index => index.name === TTL_INDEX_NAME)) {
      await db.collection(AUDIT_COLLECTION_NAME).dropIndex(TTL_INDEX_NAME)
    }
  }
})

describe('configureGlobalTtlIndexes', () => {
  describe('when globalTtl is set', () => {
    const globalTtl = 86400

    beforeEach(() => {
      config.set('data.globalTtl', globalTtl)
    })

    test('should create the TTL index when none exists', async () => {
      await configureGlobalTtlIndexes(db)

      const indexes = await db.collection(AUDIT_COLLECTION_NAME).indexes()
      const ttlIndex = indexes.find(index => index.name === TTL_INDEX_NAME)

      expect(ttlIndex).toBeDefined()
      expect(ttlIndex.expireAfterSeconds).toBe(globalTtl)
      expect(ttlIndex.key).toEqual({ received: 1 })
    })

    test('should not error when called again with the same TTL value', async () => {
      await configureGlobalTtlIndexes(db)
      await expect(configureGlobalTtlIndexes(db)).resolves.toBeUndefined()

      const indexes = await db.collection(AUDIT_COLLECTION_NAME).indexes()
      const ttlIndexes = indexes.filter(index => index.name === TTL_INDEX_NAME)

      expect(ttlIndexes).toHaveLength(1)
      expect(ttlIndexes[0].expireAfterSeconds).toBe(globalTtl)
    })

    test('should update the TTL index when the TTL value has changed', async () => {
      await configureGlobalTtlIndexes(db)

      const updatedTtl = globalTtl * 2
      config.set('data.globalTtl', updatedTtl)
      await configureGlobalTtlIndexes(db)

      const indexes = await db.collection(AUDIT_COLLECTION_NAME).indexes()
      const ttlIndex = indexes.find(index => index.name === TTL_INDEX_NAME)

      expect(ttlIndex).toBeDefined()
      expect(ttlIndex.expireAfterSeconds).toBe(updatedTtl)
    })
  })

  describe('when globalTtl is not set', () => {
    beforeEach(() => {
      config.set('data.globalTtl', null)
    })

    test('should remove the TTL index when one exists', async () => {
      await db.collection(AUDIT_COLLECTION_NAME).createIndex({ received: 1 }, { name: TTL_INDEX_NAME, expireAfterSeconds: 86400 })

      await configureGlobalTtlIndexes(db)

      const indexes = await db.collection(AUDIT_COLLECTION_NAME).indexes()
      const ttlIndex = indexes.find(index => index.name === TTL_INDEX_NAME)

      expect(ttlIndex).toBeUndefined()
    })

    test('should not error when no TTL index exists', async () => {
      await expect(configureGlobalTtlIndexes(db)).resolves.toBeUndefined()

      const indexes = await db.collection(AUDIT_COLLECTION_NAME).indexes()
      const ttlIndex = indexes.find(index => index.name === TTL_INDEX_NAME)

      expect(ttlIndex).toBeUndefined()
    })
  })
})
