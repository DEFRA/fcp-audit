import { Transform } from 'node:stream'
import { getMongoDb } from '../common/helpers/mongodb.js'
import { config } from '../config/config.js'
import { buildConditionsQuery } from './search.js'

const maxTimeMS = config.get('mongo.maxTimeMS')

function flattenObject (obj, prefix = '') {
  const result = {}

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(result, flattenObject(value, fullKey))
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const indexedKey = `${fullKey}.${i}`
        if (value[i] !== null && typeof value[i] === 'object' && !(value[i] instanceof Date)) {
          Object.assign(result, flattenObject(value[i], indexedKey))
        } else {
          result[indexedKey] = value[i]
        }
      }
    } else {
      result[fullKey] = value
    }
  }

  return result
}

function csvEscape (value) {
  if (value === null || value === undefined) {
    return ''
  }

  const str = value instanceof Date ? value.toISOString() : String(value)

  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replaceAll('"', '""')}"`
  }

  return str
}

function toCsvRow (headers, flatDoc) {
  return headers.map((h) => csvEscape(flatDoc[h])).join(',')
}

export function getDownloadStream (conditions = []) {
  const { collections } = getMongoDb()
  const { audit: auditCollection } = collections

  const query = buildConditionsQuery(conditions)

  const cursor = auditCollection.find(query, {
    projection: { _id: 0, received: 0 },
    sort: { received: -1 },
    readPreference: 'secondaryPreferred',
    maxTimeMS
  })

  let headers = null

  const transform = new Transform({
    writableObjectMode: true,
    transform (doc, _encoding, callback) {
      try {
        const flat = flattenObject(doc)

        if (headers === null) {
          headers = Object.keys(flat)
          this.push(headers.join(',') + '\n')
        }

        this.push(toCsvRow(headers, flat) + '\n')
        callback()
      } catch (err) {
        callback(err)
      }
    }
  })

  cursor.stream().pipe(transform)

  return transform
}
