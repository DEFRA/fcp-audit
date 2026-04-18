import { getMongoDb } from '../common/helpers/mongodb.js'
import { config } from '../config/config.js'

const maxTimeMS = config.get('mongo.maxTimeMS')

export const ALLOWED_FIELDS = new Set([
  'user',
  'sessionid',
  'correlationid',
  'datetime',
  'environment',
  'version',
  'application',
  'component',
  'ip',
  'audit.status',
  'audit.entities.entity',
  'audit.entities.action',
  'audit.entities.entityid',
  'audit.accounts.sbi',
  'audit.accounts.frn',
  'audit.accounts.vendor',
  'audit.accounts.trader',
  'audit.accounts.organisationId',
  'audit.accounts.crn',
  'audit.accounts.personId'
])

export const CUSTOM_FIELD_PATTERN = /^details\.[a-zA-Z_][a-zA-Z0-9_-]*$/

const entitySubFields = new Set(['audit.entities.entity', 'audit.entities.action', 'audit.entities.entityid'])
const dateCoercibleOperators = new Set(['eq', 'ne', 'lt', 'gt'])

function escapeRegex (value) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

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
    case 'contains': return { $regex: escapeRegex(value), $options: 'i' }
    case 'notContains': return { $not: { $regex: escapeRegex(value), $options: 'i' } }
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

function isValidCondition ({ field, operator, value }) {
  if (field === 'datetime' && dateCoercibleOperators.has(operator)) {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) {
      return false
    }
  }
  return true
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
  const skip = (page - 1) * pageSize

  const [result] = await auditCollection.aggregate([
    { $match: query },
    { $sort: { received: -1 } },
    {
      $facet: {
        total: [{ $count: 'count' }],
        events: [
          { $skip: skip },
          { $limit: pageSize },
          { $project: { _id: 0, received: 0 } }
        ]
      }
    }
  ], {
    readPreference: 'secondaryPreferred',
    maxTimeMS
  }).toArray()

  return {
    events: result.events,
    total: result.total[0]?.count ?? 0
  }
}
