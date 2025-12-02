import { constants as httpConstants } from 'node:http2'
import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest'

const { HTTP_STATUS_OK } = httpConstants

vi.mock('../../../../src/events/polling.js', () => ({
  startPolling: vi.fn(),
  stopPolling: vi.fn()
}))

const mockGetEvents = vi.fn()

vi.mock('../../../../src/events/get.js', () => ({
  getEvents: mockGetEvents
}))

const { createServer } = await import('../../../../src/server.js')

let server

beforeEach(async () => {
  vi.resetAllMocks()

  mockGetEvents.mockResolvedValue({ events: ['event1', 'event2'], total: 2, pages: 1 })

  server = await createServer()
  await server.initialize()
})

afterEach(async () => {
  await server.stop()
})

describe('GET /api/v1/audit', () => {
  test('should get all audit events if no query parameters are provided', async () => {
    const options = {
      method: 'GET',
      url: '/api/v1/audit'
    }
    const response = await server.inject(options)

    expect(mockGetEvents).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
    expect(response.statusCode).toBe(HTTP_STATUS_OK)
    expect(JSON.parse(response.payload)).toEqual(expect.objectContaining({ data: { events: ['event1', 'event2'] } }))
  })

  test('should pass page and pageSize query params to getEvents', async () => {
    const options = {
      method: 'GET',
      url: '/api/v1/audit?page=2&pageSize=5'
    }
    const response = await server.inject(options)

    expect(mockGetEvents).toHaveBeenCalledWith({ page: 2, pageSize: 5 })
    expect(response.statusCode).toBe(HTTP_STATUS_OK)
    expect(JSON.parse(response.payload)).toEqual(expect.objectContaining({ data: { events: ['event1', 'event2'] } }))
  })

  test('should include correct links in response', async () => {
    mockGetEvents.mockResolvedValueOnce({
      events: ['event1', 'event2'],
      total: 10,
      pages: 5
    })
    const options = {
      method: 'GET',
      url: '/api/v1/audit?page=2&pageSize=2'
    }
    const response = await server.inject(options)
    const payload = JSON.parse(response.payload)

    expect(payload.links).toEqual(expect.objectContaining({
      self: expect.any(String),
      first: expect.any(String),
      prev: expect.any(String),
      next: expect.any(String)
    }))
  })

  test('should include correct meta in response', async () => {
    mockGetEvents.mockResolvedValueOnce({
      messages: ['message1', 'message2']
    })
    const options = {
      method: 'GET',
      url: '/api/v1/audit?page=2&pageSize=2'
    }
    const response = await server.inject(options)
    const payload = JSON.parse(response.payload)

    expect(payload.meta).toEqual({
      page: 2,
      pageSize: 2
    })
  })

  test('should return 504 if database operation times out', async () => {
    mockGetEvents.mockRejectedValueOnce(new Error('operation exceeded time limit'))

    const options = {
      method: 'GET',
      url: '/api/v1/audit'
    }
    const response = await server.inject(options)

    expect(mockGetEvents).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
    expect(response.statusCode).toBe(504)
    expect(JSON.parse(response.payload).message).toBe('Operation timed out')
  })

  test('should return 500 for other errors', async () => {
    mockGetEvents.mockRejectedValueOnce(new Error('Some other database error'))

    const options = {
      method: 'GET',
      url: '/api/v1/audit'
    }
    const response = await server.inject(options)

    expect(mockGetEvents).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
    expect(response.statusCode).toBe(500)
    expect(JSON.parse(response.payload).message).toBe('An internal server error occurred')
  })
})
