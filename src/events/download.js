import { Transform } from 'node:stream'
import { getMongoDb } from '../common/helpers/mongodb.js'
import { config } from '../config/config.js'
import { buildConditionsQuery } from './search.js'

const maxTimeMS = config.get('mongo.maxTimeMS')

function flattenObject (obj, prefix = '') {
  const result = {}

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      Object.assign(result, flattenObject(value, fullKey))
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

  if (/[,"\n\r]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`
  }

  return str
}

class CsvTransform extends Transform {
  #headers = null

  constructor () {
    super({ writableObjectMode: true })
  }

  _transform (doc, _encoding, callback) {
    try {
      const flat = flattenObject(doc)

      if (this.#headers === null) {
        this.#headers = Object.keys(flat)
        this.push(this.#headers.join(',') + '\n')
      }

      this.push(this.#headers.map((h) => csvEscape(flat[h])).join(',') + '\n')
      callback()
    } catch (err) {
      callback(err)
    }
  }
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

  const transform = new CsvTransform()
  cursor.stream().on('error', (err) => transform.destroy(err)).pipe(transform)

  return transform
}
