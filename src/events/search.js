import { getMongoDb } from '../common/helpers/mongodb.js'
import { config } from '../config/config.js'

const maxTimeMS = config.get('mongo.maxTimeMS')

function buildQuery (filters) {
  const query = {}

  const stringFields = [
    ['user', 'user'],
    ['sessionid', 'sessionid'],
    ['correlationid', 'correlationid'],
    ['environment', 'environment'],
    ['version', 'version'],
    ['application', 'application'],
    ['component', 'component'],
    ['ip', 'ip'],
    ['auditStatus', 'audit.status'],
    ['accountSbi', 'audit.accounts.sbi'],
    ['accountFrn', 'audit.accounts.frn'],
    ['accountVendor', 'audit.accounts.vendor'],
    ['accountOrganisationId', 'audit.accounts.organisationId']
  ]

  for (const [filterKey, mongoField] of stringFields) {
    if (typeof filters[filterKey] === 'string' && filters[filterKey] !== '') {
      query[mongoField] = { $regex: filters[filterKey], $options: 'i' }
    }
  }

  const entityFields = [
    ['entityEntity', 'entity'],
    ['entityAction', 'action'],
    ['entityId', 'entityid']
  ]

  for (const [filterKey, entityField] of entityFields) {
    if (typeof filters[filterKey] === 'string' && filters[filterKey] !== '') {
      query['audit.entities'] = {
        ...query['audit.entities'],
        $elemMatch: {
          ...(query['audit.entities']?.$elemMatch ?? {}),
          [entityField]: { $regex: filters[filterKey], $options: 'i' }
        }
      }
    }
  }

  const { customField, customValue } = filters
  if (typeof customField === 'string' && customField !== '' && typeof customValue === 'string' && customValue !== '') {
    query[`audit.details.${customField}`] = { $regex: customValue, $options: 'i' }
  }

  const { dateFrom, dateTo } = filters
  const hasDateFrom = dateFrom instanceof Date || (typeof dateFrom === 'string' && dateFrom !== '')
  const hasDateTo = dateTo instanceof Date || (typeof dateTo === 'string' && dateTo !== '')

  if (hasDateFrom || hasDateTo) {
    query.datetime = {}
    if (hasDateFrom) {
      query.datetime.$gte = new Date(dateFrom)
    }
    if (hasDateTo) {
      query.datetime.$lte = new Date(dateTo)
    }
  }

  return query
}

export async function searchEvents ({ filters = {}, page, pageSize }) {
  const { collections } = getMongoDb()
  const { audit: auditCollection } = collections

  const query = buildQuery(filters)

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
