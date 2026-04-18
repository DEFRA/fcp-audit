import { getMongoDb } from '../common/helpers/mongodb.js'
import { config } from '../config/config.js'

const maxTimeMS = config.get('mongo.maxTimeMS')

const entitySubFields = new Set(['audit.entities.entity', 'audit.entities.action', 'audit.entities.entityid'])
const dateCoercibleOperators = new Set(['eq', 'ne', 'lt', 'gt'])

function coerceValue (field, operator, value) {
  if (field === 'datetime' && dateCoercibleOperators.has(operator)) {
    return new Date(value)
  }
  return value
}

function buildCondition (operator, value) {
  switch (operator) {
    case 'eq': return { $eq: value }
    case 'ne': return { $ne: value }
    case 'lt': return { $lt: value }
    case 'gt': return { $gt: value }
    case 'contains': return { $regex: value, $options: 'i' }
    case 'notContains': return { $not: { $regex: value, $options: 'i' } }
    default: return undefined
  }
}

function resolveMongoField (field) {
  if (field.startsWith('details.')) {
    return `audit.${field}`
  }
  return field
}

function applyEntityCondition (entityElemMatch, field, operator, value) {
  const subField = field.split('.')[2]
  const condition = buildCondition(operator, coerceValue(subField, operator, value))
  if (condition !== undefined) {
    entityElemMatch[subField] = condition
  }
}

function applyRegularCondition (query, field, operator, value) {
  const mongoField = resolveMongoField(field)
  const condition = buildCondition(operator, coerceValue(mongoField, operator, value))
  if (condition === undefined) {
    return
  }
  if (typeof query[mongoField] === 'object' && query[mongoField] !== null && typeof condition === 'object') {
    Object.assign(query[mongoField], condition)
  } else {
    query[mongoField] = condition
  }
}

function isValidCondition ({ field, value }) {
  return typeof field === 'string' && field !== '' && typeof value === 'string' && value !== ''
}

function buildConditionsQuery (conditions) {
  const query = {}
  const entityElemMatch = {}

  for (const { field, operator, value } of conditions.filter(isValidCondition)) {
    if (entitySubFields.has(field)) {
      applyEntityCondition(entityElemMatch, field, operator, value)
    } else {
      applyRegularCondition(query, field, operator, value)
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
