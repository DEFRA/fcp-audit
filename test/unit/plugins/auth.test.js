import { expect, test, describe, beforeEach, vi } from 'vitest'

const mockConfigGet = vi.fn()
vi.mock('../../../src/config/config.js', () => ({
  config: {
    get: mockConfigGet
  }
}))

describe('auth plugin', () => {
  let mockServer
  let auth

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()

    mockServer = {
      auth: {
        strategy: vi.fn(),
        default: vi.fn()
      }
    }

    mockConfigGet.mockImplementation((key) => {
      switch (key) {
        case 'auth.enabled':
          return true
        case 'auth.tenant':
          return 'test-tenant-id'
        case 'auth.allowedGroupIds':
          return ['group-1', 'group-2']
        default:
          return null
      }
    })

    const authModule = await import('../../../src/plugins/auth.js')
    auth = authModule.auth
  })

  test('should have a name', () => {
    expect(auth.plugin.name).toBe('auth')
  })

  test('should have a register function', () => {
    expect(auth.plugin.register).toBeInstanceOf(Function)
  })

  describe('register function', () => {
    test('should register auth strategy when auth is enabled', async () => {
      await auth.plugin.register(mockServer)

      expect(mockServer.auth.strategy).toHaveBeenCalledWith(
        'entra',
        'jwt',
        expect.objectContaining({
          keys: expect.objectContaining({
            uri: 'https://login.microsoftonline.com/test-tenant-id/discovery/v2.0/keys'
          }),
          verify: expect.objectContaining({
            aud: false,
            sub: false,
            iss: ['https://sts.windows.net/test-tenant-id/', 'https://login.microsoftonline.com/test-tenant-id/v2.0'],
            nbf: true,
            exp: true
          }),
          validate: expect.any(Function)
        })
      )
    })

    test('should set default auth strategy when auth is enabled', async () => {
      await auth.plugin.register(mockServer)

      expect(mockServer.auth.default).toHaveBeenCalledWith('entra')
    })

    test('should not register auth strategy when auth is disabled', async () => {
      mockConfigGet.mockImplementation((key) => {
        if (key === 'auth.enabled') return false
        return null
      })

      await auth.plugin.register(mockServer)

      expect(mockServer.auth.strategy).not.toHaveBeenCalled()
      expect(mockServer.auth.default).not.toHaveBeenCalled()
    })

    test('should use correct JWKS URI with tenant ID', async () => {
      vi.resetModules()
      mockConfigGet.mockImplementation((key) => {
        switch (key) {
          case 'auth.enabled':
            return true
          case 'auth.tenant':
            return 'my-custom-tenant'
          case 'auth.allowedGroupIds':
            return ['group-1']
          default:
            return null
        }
      })

      const { auth: authWithCustomTenant } = await import('../../../src/plugins/auth.js')
      const newMockServer = {
        auth: {
          strategy: vi.fn(),
          default: vi.fn()
        }
      }

      await authWithCustomTenant.plugin.register(newMockServer)

      const authOptions = newMockServer.auth.strategy.mock.calls[0][2]
      expect(authOptions.keys.uri).toBe('https://login.microsoftonline.com/my-custom-tenant/discovery/v2.0/keys')
    })

    test('should accept both v1.0 and v2.0 token issuers', async () => {
      await auth.plugin.register(mockServer)

      const authOptions = mockServer.auth.strategy.mock.calls[0][2]
      expect(authOptions.verify.iss).toEqual([
        'https://sts.windows.net/test-tenant-id/',
        'https://login.microsoftonline.com/test-tenant-id/v2.0'
      ])
    })
  })

  describe('validate function', () => {
    let validateFunction
    let mockRequest
    let mockH

    beforeEach(async () => {
      await auth.plugin.register(mockServer)
      validateFunction = mockServer.auth.strategy.mock.calls[0][2].validate
      mockRequest = {}
      mockH = {}
    })

    test('should return valid result for valid JWT token with allowed groups', async () => {
      const payload = {
        typ: 'JWT',
        sub: 'user-123',
        groups: ['group-1', 'group-3']
      }

      const artifacts = {
        decoded: { payload }
      }

      const result = await validateFunction(artifacts, mockRequest, mockH)

      expect(result.isValid).toBe(true)
      expect(result.credentials).toEqual({
        token: payload,
        principalId: 'user-123'
      })
    })

    test('should return valid result for at+jwt token type', async () => {
      const payload = {
        typ: 'at+jwt',
        sub: 'user-123',
        groups: ['group-1']
      }

      const artifacts = {
        decoded: { payload }
      }

      const result = await validateFunction(artifacts, mockRequest, mockH)

      expect(result.isValid).toBe(true)
    })

    test('should reject token with invalid type', async () => {
      const payload = {
        typ: 'refresh',
        sub: 'user-123',
        groups: ['group-1']
      }

      const artifacts = {
        decoded: { payload }
      }

      const result = await validateFunction(artifacts, mockRequest, mockH)

      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBe('Provided token is not an access token')
    })

    test('should reject token when no allowed groups are configured', async () => {
      mockConfigGet.mockImplementation((key) => {
        switch (key) {
          case 'auth.enabled':
            return true
          case 'auth.tenant':
            return 'test-tenant-id'
          case 'auth.allowedGroupIds':
            return []
          default:
            return null
        }
      })

      vi.resetModules()
      const { auth: authWithEmptyGroups } = await import('../../../src/plugins/auth.js')
      await authWithEmptyGroups.plugin.register(mockServer)
      const validateFunc = mockServer.auth.strategy.mock.calls[1][2].validate

      const payload = {
        typ: 'JWT',
        sub: 'user-123',
        groups: ['group-1']
      }

      const artifacts = {
        decoded: { payload }
      }

      const result = await validateFunc(artifacts, mockRequest, mockH)

      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBe('No authorized security groups configured')
    })

    test('should reject token without matching security groups', async () => {
      const payload = {
        typ: 'JWT',
        sub: 'user-123',
        groups: ['group-3', 'group-4']
      }

      const artifacts = {
        decoded: { payload }
      }

      const result = await validateFunction(artifacts, mockRequest, mockH)

      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBe('Token does not belong to an authorized Security Group')
    })

    test('should reject token without groups claim', async () => {
      const payload = {
        typ: 'JWT',
        sub: 'user-123'
      }

      const artifacts = {
        decoded: { payload }
      }

      const result = await validateFunction(artifacts, mockRequest, mockH)

      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBe('Token does not belong to an authorized Security Group')
    })

    test('should reject token when groups claim is not an array', async () => {
      const payload = {
        typ: 'JWT',
        sub: 'user-123',
        groups: 'not-an-array'
      }

      const artifacts = {
        decoded: { payload }
      }

      const result = await validateFunction(artifacts, mockRequest, mockH)

      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBe('Token does not belong to an authorized Security Group')
    })

    test('should accept token with one matching group among many', async () => {
      const payload = {
        typ: 'JWT',
        sub: 'user-123',
        groups: ['group-3', 'group-2', 'group-4']
      }

      const artifacts = {
        decoded: { payload }
      }

      const result = await validateFunction(artifacts, mockRequest, mockH)

      expect(result.isValid).toBe(true)
      expect(result.credentials.principalId).toBe('user-123')
    })

    test('should accept token without typ claim', async () => {
      const payload = {
        sub: 'user-123',
        groups: ['group-1']
      }

      const artifacts = {
        decoded: { payload }
      }

      const result = await validateFunction(artifacts, mockRequest, mockH)

      expect(result.isValid).toBe(true)
    })

    test('should preserve all token payload in credentials', async () => {
      const payload = {
        typ: 'JWT',
        sub: 'user-123',
        groups: ['group-1'],
        name: 'Test User',
        email: 'test@example.com',
        custom_claim: 'custom_value'
      }

      const artifacts = {
        decoded: { payload }
      }

      const result = await validateFunction(artifacts, mockRequest, mockH)

      expect(result.isValid).toBe(true)
      expect(result.credentials.token).toEqual(payload)
      expect(result.credentials.token.name).toBe('Test User')
      expect(result.credentials.token.email).toBe('test@example.com')
      expect(result.credentials.token.custom_claim).toBe('custom_value')
    })

    test('should reject token with empty groups array', async () => {
      const payload = {
        typ: 'JWT',
        sub: 'user-123',
        groups: []
      }

      const artifacts = {
        decoded: { payload }
      }

      const result = await validateFunction(artifacts, mockRequest, mockH)

      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBe('Token does not belong to an authorized Security Group')
    })
  })

  describe('configuration scenarios', () => {
    test('should reject token when allowedGroupIds config is null', async () => {
      vi.resetModules()
      mockConfigGet.mockImplementation((key) => {
        switch (key) {
          case 'auth.enabled':
            return true
          case 'auth.tenant':
            return 'test-tenant-id'
          case 'auth.allowedGroupIds':
            return null
          default:
            return null
        }
      })

      const { auth: authWithNullGroups } = await import('../../../src/plugins/auth.js')
      const newMockServer = {
        auth: {
          strategy: vi.fn(),
          default: vi.fn()
        }
      }

      await authWithNullGroups.plugin.register(newMockServer)
      const validateFunc = newMockServer.auth.strategy.mock.calls[0][2].validate

      const payload = {
        typ: 'JWT',
        sub: 'user-123',
        groups: ['some-group']
      }

      const artifacts = {
        decoded: { payload }
      }

      const result = await validateFunc(artifacts, {}, {})

      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBe('No authorized security groups configured')
    })

    test('should reject token when allowedGroupIds config is undefined', async () => {
      vi.resetModules()
      mockConfigGet.mockImplementation((key) => {
        switch (key) {
          case 'auth.enabled':
            return true
          case 'auth.tenant':
            return 'test-tenant-id'
          case 'auth.allowedGroupIds':
            return undefined
          default:
            return null
        }
      })

      const { auth: authWithUndefinedGroups } = await import('../../../src/plugins/auth.js')
      const newMockServer = {
        auth: {
          strategy: vi.fn(),
          default: vi.fn()
        }
      }

      await authWithUndefinedGroups.plugin.register(newMockServer)
      const validateFunc = newMockServer.auth.strategy.mock.calls[0][2].validate

      const payload = {
        typ: 'JWT',
        sub: 'user-123',
        groups: ['some-group']
      }

      const artifacts = {
        decoded: { payload }
      }

      const result = await validateFunc(artifacts, {}, {})

      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBe('No authorized security groups configured')
    })
  })
})
