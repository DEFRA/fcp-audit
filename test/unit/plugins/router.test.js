import { expect, test, describe, beforeEach, vi } from 'vitest'

vi.mock('../../../src/routes/health.js')
vi.mock('../../../src/routes/audit.js')

const { health } = await import('../../../src/routes/health.js')
const { audit } = await import('../../../src/routes/audit.js')

const mockServer = {
  route: vi.fn()
}

const { router } = await import('../../../src/plugins/router.js')

describe('router plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should have a name', () => {
    expect(router.plugin.name).toBe('router')
  })

  test('should have a register function', () => {
    expect(router.plugin.register).toBeInstanceOf(Function)
  })

  test('should register routes', () => {
    router.plugin.register(mockServer)
    expect(mockServer.route).toHaveBeenCalledTimes(1)
  })

  test('should register health route', () => {
    router.plugin.register(mockServer)
    expect(mockServer.route).toHaveBeenCalledWith(expect.arrayContaining([health]))
  })

  test('should register audit route', () => {
    router.plugin.register(mockServer)
    expect(mockServer.route).toHaveBeenCalledWith(expect.arrayContaining(audit))
  })
})
