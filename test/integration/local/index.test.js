import { describe, test, vi } from 'vitest'

vi.mock('../../../src/events/polling.js')

describe('startup and shutdown', () => {
  test('should start and stop the server without errors', async () => {
    await import('../../../src/index.js')
  })
})
