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
  #headers = []
  #seen = new Set()
  #docs = []

  constructor () {
    super({ writableObjectMode: true })
  }

  _transform (doc, _encoding, callback) {
    try {
      const flat = flattenObject(doc)

      for (const key of Object.keys(flat)) {
        if (!this.#seen.has(key)) {
          this.#seen.add(key)
          this.#headers.push(key)
        }
      }

      this.#docs.push(flat)
      callback()
    } catch (err) {
      callback(err)
    }
  }

  _flush (callback) {
    try {
      if (this.#docs.length === 0) {
        callback()
        return
      }

      this.push(this.#headers.join(',') + '\n')

      for (const flat of this.#docs) {
        this.push(this.#headers.map((h) => csvEscape(flat[h])).join(',') + '\n')
      }

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
