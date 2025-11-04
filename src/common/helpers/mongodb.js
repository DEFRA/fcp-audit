import { MongoClient } from 'mongodb'
import { config } from '../../config/config.js'

const AUDIT_COLLECTION_NAME = 'audit'

const mongo = {
  collections: {}
}

export const mongoDb = {
  plugin: {
    name: 'mongodb',
    version: '1.0.0',
    register: async function (server, options) {
      server.logger.info('Setting up MongoDb')

      await createMongoDbConnection(options)

      server.logger.info(`MongoDb connected to ${options.databaseName}`)
      server.events.on('stop', async () => {
        server.logger.info('Closing Mongo client')
        try {
          await closeMongoDbConnection()
        } catch (err) {
          server.logger.error(err, 'failed to close mongo client')
        }
      })
    }
  },
  options: config.get('mongo')
}

export async function createMongoDbConnection (options) {
  if (!mongo.client || !mongo.db) {
    mongo.client = await MongoClient.connect(options.mongoUrl, {
      ...options.mongoOptions
    })
    mongo.db = mongo.client.db(options.databaseName)
    mongo.databaseName = options.databaseName
    mongo.collections = {
      audit: mongo.db.collection(AUDIT_COLLECTION_NAME)
    }

    await createIndexes(mongo.db)
    await configureGlobalTtlIndexes(mongo.db)
  }
}

export async function closeMongoDbConnection () {
  await mongo.client?.close(true)
}

export function getMongoDb () {
  return { client: mongo.client, db: mongo.db, collections: mongo.collections }
}

async function createIndexes (db) {
  await db.collection(AUDIT_COLLECTION_NAME).createIndex({ type: 1, received: -1 }, { name: 'events_type_by_received' })
  await db.collection(AUDIT_COLLECTION_NAME).createIndex({ type: 1, time: -1 }, { name: 'events_type_by_time' })
}

async function configureGlobalTtlIndexes (db) {
  const globalTtl = config.get('data.globalTtl')

  if (globalTtl) {
    await db.collection(AUDIT_COLLECTION_NAME).createIndex({ received: 1 }, { name: 'events_ttl', expireAfterSeconds: globalTtl })
  } else {
    await removeTtlIndexes(db)
  }
}

async function removeTtlIndexes (db) {
  const collections = await db.listCollections().toArray()
  const ttlIndexesToRemove = [
    { collection: AUDIT_COLLECTION_NAME, indexName: 'events_ttl' },
  ]

  for (const { collection, indexName } of ttlIndexesToRemove) {
    if (collections.some(c => c.name === collection)) {
      const indexes = await db.collection(collection).indexes()
      if (indexes.some(index => index.name === indexName)) {
        await db.collection(collection).dropIndex(indexName)
      }
    }
  }
}
