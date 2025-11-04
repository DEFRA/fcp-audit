import { expect, test, describe, beforeEach, vi } from 'vitest'

const mockServer = {
  ext: vi.fn()
}

const { mongoTimeout } = await import('../../../src/plugins/mongo-timeout.js')

describe('mongo-timeout plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should have a name', () => {
    expect(mongoTimeout.plugin.name).toBe('mongo-timeout')
  })

  test('should have a register function', () => {
    expect(mongoTimeout.plugin.register).toBeInstanceOf(Function)
  })

  test('should register onPreResponse extension', () => {
    mongoTimeout.plugin.register(mockServer)
    expect(mockServer.ext).toHaveBeenCalledWith('onPreResponse', expect.any(Function))
  })
})
