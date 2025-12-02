import { getMongoDb } from '../common/helpers/mongodb.js'
import { config } from '../config/config.js'

const maxTimeMS = config.get('mongo.maxTimeMS')

export async function saveEvent (auditEvent) {
  const { collections } = getMongoDb()
  const { audit: auditCollection } = collections

  const now = new Date()
  const auditEntity = { _id: generateAuditId(auditEvent), ...auditEvent, received: now }

  await auditCollection.updateOne(
    { _id: auditEntity._id },
    { $setOnInsert: auditEntity },
    { upsert: true, maxTimeMS }
  )
}

function toBase64 (str) {
  return Buffer.from(str, 'utf-8').toString('base64')
}

export function generateAuditId (event) {
  const rawId = `${event.application}|${event.sessionid}|${event.datetime}|${event.ip}`
  return toBase64(rawId)
}
