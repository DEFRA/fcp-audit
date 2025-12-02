import { getMongoDb } from '../common/helpers/mongodb.js'
import { config } from '../config/config.js'

const maxTimeMS = config.get('mongo.maxTimeMS')

export async function getEvents ({ page, pageSize }) {
  const { collections } = getMongoDb()
  const { audit: auditCollection } = collections

  const cursor = auditCollection.find({}, {
    sort: { received: -1 },
    readPreference: 'secondaryPreferred',
    maxTimeMS
  })
    .skip((page - 1) * pageSize)
    .limit(pageSize)

  const events = await cursor.toArray()

  return { events }
}
