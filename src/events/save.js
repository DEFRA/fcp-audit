import { getMongoDb } from '../common/helpers/mongodb.js'
import { config } from '../config/config.js'

const maxTimeMS = config.get('mongo.maxTimeMS')

export async function saveEvent (auditEvent, messageContext) {
  const { collections } = getMongoDb()
  const { audit: auditCollection } = collections

  const now = new Date()
  const auditEntity = { _id: generateAuditId(messageContext), ...auditEvent, received: now }

  await auditCollection.updateOne(
    { _id: auditEntity._id },
    { $setOnInsert: auditEntity },
    { upsert: true, maxTimeMS }
  )
}

export function generateAuditId ({ messageId, sentTimestamp }) {
  // SQS only guarantees MessageId is unique "for an extended period of time", not forever. Although practically
  // unlikely, it is theoretically possible for a collision to occur, given this guarantee. Prefixing with the
  // timestamp the message was sent adds an additional layer of uniqueness to further reduce any chance of collision.
  return `${sentTimestamp}-${messageId}`
}
