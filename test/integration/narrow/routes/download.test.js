import { Readable } from 'node:stream'
import { constants as httpConstants } from 'node:http2'
import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest'

const { HTTP_STATUS_OK, HTTP_STATUS_BAD_REQUEST } = httpConstants

vi.mock('../../../../src/events/polling.js', () => ({
  startPolling: vi.fn(),
  stopPolling: vi.fn()
}))

const mockGetDownloadStream = vi.fn()

vi.mock('../../../../src/events/download.js', () => ({
  getDownloadStream: mockGetDownloadStream
}))

const { createServer } = await import('../../../../src/server.js')

let server

function makeCsvReadable (csvString) {
  const r = new Readable({ read () {} })
  r.push(csvString)
  r.push(null)
  return r
}

beforeEach(async () => {
  vi.resetAllMocks()

  mockGetDownloadStream.mockReturnValue(
    makeCsvReadable('application,component\nFCP001,fcp-audit\n')
  )

  server = await createServer()
  await server.initialize()
})

afterEach(async () => {
  await server.stop()
})

describe('GET /api/v1/audit/download', () => {
  test('returns 200 with text/csv content type', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/audit/download'
    })

    expect(response.statusCode).toBe(HTTP_STATUS_OK)
    expect(response.headers['content-type']).toMatch(/text\/csv/)
  })

  test('sets Content-Disposition header for file download', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/audit/download'
    })

    expect(response.headers['content-disposition']).toBe('attachment; filename="audit-events.csv"')
  })

  test('returns CSV body from stream', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/audit/download'
    })

    expect(response.payload).toBe('application,component\nFCP001,fcp-audit\n')
  })

  test('calls getDownloadStream with empty conditions by default', async () => {
    await server.inject({
      method: 'GET',
      url: '/api/v1/audit/download'
    })

    expect(mockGetDownloadStream).toHaveBeenCalledWith([])
  })

  test('passes parsed conditions to getDownloadStream', async () => {
    const url = '/api/v1/audit/download?conditions[0][field]=application&conditions[0][operator]=eq&conditions[0][value]=FCP001'

    await server.inject({ method: 'GET', url })

    expect(mockGetDownloadStream).toHaveBeenCalledWith([
      { field: 'application', operator: 'eq', value: 'FCP001' }
    ])
  })

  test('returns 400 for invalid condition field', async () => {
    const url = '/api/v1/audit/download?conditions[0][field]=__invalid__&conditions[0][operator]=eq&conditions[0][value]=FCP001'

    const response = await server.inject({ method: 'GET', url })

    expect(response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
  })
})
