import { constants as httpConstants } from 'node:http2'
import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest'

const { HTTP_STATUS_OK } = httpConstants

vi.mock('../../../../src/events/polling.js', () => ({
  startPolling: vi.fn(),
  stopPolling: vi.fn()
}))

const { createServer } = await import('../../../../src/server.js')

let server

describe('health routes', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    server = await createServer()
    await server.initialize()
  })

  afterEach(async () => {
    await server.stop()
  })

  test('GET /health should return 200', async () => {
    const options = {
      method: 'GET',
      url: '/health'
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(HTTP_STATUS_OK)
  })

  test('GET /health should return "ok" response', async () => {
    const options = {
      method: 'GET',
      url: '/health'
    }
    const response = await server.inject(options)
    expect(JSON.parse(response.payload).message).toBe('success')
  })
})
