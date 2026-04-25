import { Readable } from 'node:stream'
import { vi, describe, beforeEach, test, expect } from 'vitest'

const mockFind = vi.fn()
const mockStream = vi.fn()

vi.mock('../../../src/common/helpers/mongodb.js', () => ({
  getMongoDb: () => ({
    collections: {
      audit: {
        find: mockFind
      }
    }
  })
}))

vi.mock('../../../src/config/config.js', () => ({
  config: {
    get: vi.fn().mockReturnValue(30000)
  }
}))

const mockBuildConditionsQuery = vi.fn()

vi.mock('../../../src/events/search.js', () => ({
  buildConditionsQuery: mockBuildConditionsQuery
}))

const { getDownloadStream } = await import('../../../src/events/download.js')

function streamToString (stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('end', () => resolve(chunks.join('')))
    stream.on('error', reject)
  })
}

function makeObjectReadable (docs) {
  const r = new Readable({ objectMode: true, read () {} })
  for (const doc of docs) {
    r.push(doc)
  }
  r.push(null)
  return r
}

describe('getDownloadStream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBuildConditionsQuery.mockReturnValue({})

    const fakeReadable = makeObjectReadable([])
    mockStream.mockReturnValue(fakeReadable)
    mockFind.mockReturnValue({ stream: mockStream })
  })

  test('calls buildConditionsQuery with provided conditions', () => {
    const conditions = [{ field: 'application', operator: 'eq', value: 'FCP001' }]
    getDownloadStream(conditions)
    expect(mockBuildConditionsQuery).toHaveBeenCalledWith(conditions)
  })

  test('calls find with the built query and correct options', () => {
    mockBuildConditionsQuery.mockReturnValue({ application: { $eq: 'FCP001' } })
    getDownloadStream([])
    expect(mockFind).toHaveBeenCalledWith(
      { application: { $eq: 'FCP001' } },
      expect.objectContaining({
        projection: { _id: 0, received: 0 },
        sort: { received: -1 }
      })
    )
  })

  test('defaults to empty conditions when none provided', () => {
    getDownloadStream()
    expect(mockBuildConditionsQuery).toHaveBeenCalledWith([])
  })

  test('returns a readable stream', () => {
    const result = getDownloadStream([])
    expect(typeof result.pipe).toBe('function')
    expect(typeof result.on).toBe('function')
  })

  test('emits CSV header row from first document keys using dot notation', async () => {
    const docs = [
      {
        application: 'FCP001',
        component: 'fcp-audit',
        audit: {
          status: 'success',
          entities: [{ entity: 'application', action: 'created' }]
        }
      }
    ]
    mockFind.mockReturnValue({ stream: () => makeObjectReadable(docs) })

    const result = getDownloadStream([])
    const csv = await streamToString(result)
    const lines = csv.trim().split('\n')

    expect(lines[0]).toBe('application,component,audit.status,audit.entities.0.entity,audit.entities.0.action')
  })

  test('emits data rows with values in correct column order', async () => {
    const docs = [
      {
        application: 'FCP001',
        component: 'fcp-audit',
        audit: {
          status: 'success',
          entities: [{ entity: 'application', action: 'created' }]
        }
      }
    ]
    mockFind.mockReturnValue({ stream: () => makeObjectReadable(docs) })

    const result = getDownloadStream([])
    const csv = await streamToString(result)
    const lines = csv.trim().split('\n')

    expect(lines[1]).toBe('FCP001,fcp-audit,success,application,created')
  })

  test('emits empty string for missing keys in subsequent rows', async () => {
    const docs = [
      {
        application: 'FCP001',
        audit: { status: 'success', entities: [{ entity: 'application', action: 'created' }] }
      },
      {
        application: 'FCP002'
        // no audit property
      }
    ]
    mockFind.mockReturnValue({ stream: () => makeObjectReadable(docs) })

    const result = getDownloadStream([])
    const csv = await streamToString(result)
    const lines = csv.trim().split('\n')

    // Row 2 (index 2) should have FCP002 then empty strings for audit cols
    expect(lines[2]).toBe('FCP002,,,')
  })

  test('wraps values containing commas in double-quotes', async () => {
    const docs = [{ component: 'has,comma', application: 'ok' }]
    mockFind.mockReturnValue({ stream: () => makeObjectReadable(docs) })

    const result = getDownloadStream([])
    const csv = await streamToString(result)
    const lines = csv.trim().split('\n')

    expect(lines[1]).toBe('"has,comma",ok')
  })

  test('escapes double-quotes within values', async () => {
    const docs = [{ component: 'say "hello"', application: 'ok' }]
    mockFind.mockReturnValue({ stream: () => makeObjectReadable(docs) })

    const result = getDownloadStream([])
    const csv = await streamToString(result)
    const lines = csv.trim().split('\n')

    expect(lines[1]).toBe('"say ""hello""",ok')
  })

  test('wraps values containing newlines in double-quotes', async () => {
    const docs = [{ component: 'line1\nline2', application: 'ok' }]
    mockFind.mockReturnValue({ stream: () => makeObjectReadable(docs) })

    const result = getDownloadStream([])
    const csv = await streamToString(result)
    const lines = csv.split('\n')

    // First data row starts with a quoted value
    expect(lines[1]).toMatch(/^"line1/)
  })

  test('emits null values as empty string', async () => {
    const docs = [{ application: 'FCP001', component: null }]
    mockFind.mockReturnValue({ stream: () => makeObjectReadable(docs) })

    const result = getDownloadStream([])
    const csv = await streamToString(result)
    const lines = csv.trim().split('\n')

    expect(lines[1]).toBe('FCP001,')
  })

  test('emits Date objects as ISO strings', async () => {
    const date = new Date('2025-01-01T00:00:00.000Z')
    const docs = [{ datetime: date }]
    mockFind.mockReturnValue({ stream: () => makeObjectReadable(docs) })

    const result = getDownloadStream([])
    const csv = await streamToString(result)
    const lines = csv.trim().split('\n')

    expect(lines[1]).toBe('2025-01-01T00:00:00.000Z')
  })

  test('produces no rows (only header) when cursor is empty', async () => {
    mockFind.mockReturnValue({ stream: () => makeObjectReadable([]) })

    const result = getDownloadStream([])
    const csv = await streamToString(result)

    expect(csv).toBe('')
  })
})
