import { constants as httpConstants } from 'node:http2'
import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest'

const { HTTP_STATUS_OK } = httpConstants

vi.mock('../../../../src/events/polling.js', () => ({
  startPolling: vi.fn(),
  stopPolling: vi.fn()
}))

const mockGetSummary = vi.fn()
const mockSearchEvents = vi.fn()

vi.mock('../../../../src/events/summary.js', () => ({
  getSummary: mockGetSummary
}))

vi.mock('../../../../src/events/search.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    searchEvents: mockSearchEvents
  }
})

const { createServer } = await import('../../../../src/server.js')

let server

describe('GET /api/v1/audit/summary', () => {
  beforeEach(async () => {
    vi.resetAllMocks()

    mockGetSummary.mockResolvedValue({ total: 3, applications: [{ application: 'FCP001', total: 3, components: [] }] })
    mockSearchEvents.mockResolvedValue({ events: [], total: 0 })

    server = await createServer()
    await server.initialize()
  })

  afterEach(async () => {
    await server.stop()
  })

  test('returns 200 with summary data', async () => {
    const response = await server.inject({ method: 'GET', url: '/api/v1/audit/summary' })

    expect(response.statusCode).toBe(HTTP_STATUS_OK)

    const payload = JSON.parse(response.payload)
    expect(payload.data.summary.total).toBe(3)
    expect(payload.data.summary.applications).toEqual([{ application: 'FCP001', total: 3, components: [] }])
  })
})

describe('GET /api/v1/audit/search', () => {
  beforeEach(async () => {
    vi.resetAllMocks()

    mockGetSummary.mockResolvedValue({ total: 0, applications: [] })
    mockSearchEvents.mockResolvedValue({ events: ['event1', 'event2'], total: 10 })

    server = await createServer()
    await server.initialize()
  })

  afterEach(async () => {
    await server.stop()
  })

  test('returns 200 with events array and meta total', async () => {
    const response = await server.inject({ method: 'GET', url: '/api/v1/audit/search' })

    expect(response.statusCode).toBe(HTTP_STATUS_OK)

    const payload = JSON.parse(response.payload)
    expect(Array.isArray(payload.data.events)).toBe(true)
    expect(payload.meta.total).toBe(10)
  })

  test('with conditions query param calls searchEvents with correct conditions', async () => {
    const url = '/api/v1/audit/search?conditions[0][field]=application&conditions[0][operator]=eq&conditions[0][value]=FCP001'
    const response = await server.inject({ method: 'GET', url })

    expect(response.statusCode).toBe(HTTP_STATUS_OK)
    expect(mockSearchEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        conditions: [{ field: 'application', operator: 'eq', value: 'FCP001' }]
      })
    )
  })

  test('with page and pageSize returns correct meta', async () => {
    const response = await server.inject({ method: 'GET', url: '/api/v1/audit/search?page=2&pageSize=5' })

    expect(response.statusCode).toBe(HTTP_STATUS_OK)

    const payload = JSON.parse(response.payload)
    expect(payload.meta.page).toBe(2)
    expect(payload.meta.pageSize).toBe(5)
  })

  test('with disallowed field returns 400', async () => {
    const url = '/api/v1/audit/search?conditions[0][field]=_id&conditions[0][operator]=eq&conditions[0][value]=anything'
    const response = await server.inject({ method: 'GET', url })

    expect(response.statusCode).toBe(400)
  })

  test('with valid custom details field returns 200', async () => {
    const url = '/api/v1/audit/search?conditions[0][field]=details.caseid&conditions[0][operator]=eq&conditions[0][value]=CRM-001'
    const response = await server.inject({ method: 'GET', url })

    expect(response.statusCode).toBe(HTTP_STATUS_OK)
  })
})
