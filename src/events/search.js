import { getMongoDb } from '../common/helpers/mongodb.js'
import { config } from '../config/config.js'

const maxTimeMS = config.get('mongo.maxTimeMS')

const entitySubFields = new Set(['audit.entities.entity', 'audit.entities.action', 'audit.entities.entityid'])

function applyOperator (mongoField, operator, value) {
  const isDateField = mongoField === 'datetime'
  const coercedValue = (isDateField && (operator === 'lt' || operator === 'gt' || operator === 'eq' || operator === 'ne'))
    ? new Date(value)
    : value

  switch (operator) {
    case 'eq': return { [mongoField]: { $eq: coercedValue } }
    case 'ne': return { [mongoField]: { $ne: coercedValue } }
    case 'lt': return { [mongoField]: { $lt: coercedValue } }
    case 'gt': return { [mongoField]: { $gt: coercedValue } }
    case 'contains': return { [mongoField]: { $regex: value, $options: 'i' } }
    case 'notContains': return { [mongoField]: { $not: { $regex: value, $options: 'i' } } }
    default: return {}
  }
}

function resolveMongoField (field) {
  if (field.startsWith('details.')) {
    return `audit.${field}`
  }
  return field
}

function buildConditionsQuery (conditions) {
  const query = {}
  const entityElemMatch = {}

  for (const { field, operator, value } of conditions) {
    if (typeof field !== 'string' || field === '' || typeof value !== 'string' || value === '') continue

    if (entitySubFields.has(field)) {
      const subField = field.split('.')[2]
      const subCondition = applyOperator(subField, operator, value)[subField]
      if (subCondition !== undefined) {
        entityElemMatch[subField] = subCondition
      }
    } else {
      const mongoField = resolveMongoField(field)
      const subCondition = applyOperator(mongoField, operator, value)[mongoField]
      if (query[mongoField] !== undefined && typeof query[mongoField] === 'object' && typeof subCondition === 'object') {
        Object.assign(query[mongoField], subCondition)
      } else {
        query[mongoField] = subCondition
      }
    }
  }

  if (Object.keys(entityElemMatch).length > 0) {
    query['audit.entities'] = { $elemMatch: entityElemMatch }
  }

  return query
}

export async function searchEvents ({ conditions = [], page, pageSize }) {
  const { collections } = getMongoDb()
  const { audit: auditCollection } = collections

  const query = buildConditionsQuery(conditions)

  const [total, events] = await Promise.all([
    auditCollection.countDocuments(query),
    auditCollection.find(query, {
      sort: { received: -1 },
      readPreference: 'secondaryPreferred',
      maxTimeMS
    })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray()
  ])

  return { events, total }
}
