import { expect, test, describe, beforeEach, afterAll, vi } from 'vitest'

describe('config', () => {
  const PROCESS_ENV = process.env

  beforeEach(() => {
    vi.resetModules()

    process.env = { ...PROCESS_ENV }

    process.env.NODE_ENV = 'test'

    process.env.HOST = '1.1.1.1'
    process.env.PORT = '6000'
    process.env.SERVICE_VERSION = '1.0.0'
    process.env.ENVIRONMENT = 'dev'
    process.env.LOG_ENABLED = 'true'
    process.env.LOG_LEVEL = 'debug'
    process.env.LOG_FORMAT = 'ecs'
    process.env.HTTP_PROXY = 'http://proxy:8080'
    process.env.ENABLE_SECURE_CONTEXT = 'true'
    process.env.ENABLE_METRICS = 'true'
    process.env.TRACING_HEADER = 'x-custom-trace-id'
    process.env.AUTH_ENABLED = 'false'
    process.env.AUTH_TENANT_ID = 'test-tenant-123'
    process.env.AUTH_ALLOWED_GROUP_IDS = '12345678-1234-1234-1234-123456789012,87654321-4321-4321-4321-210987654321'
  })

  afterAll(() => {
    process.env = { ...PROCESS_ENV }
  })

  test('should return host from environment variable', async () => {
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('host')).toBe('1.1.1.1')
  })

  test('should default host to 0.0.0.0 if not provided in environment variable', async () => {
    delete process.env.HOST
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('host')).toBe('0.0.0.0')
  })

  test('should throw error if host is not an IP address', async () => {
    process.env.HOST = 'invalid-ip-address'
    await expect(async () => await import('../../../src/config/config.js')).rejects.toThrow()
  })

  test('should return port from environment variable', async () => {
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('port')).toBe(6000)
  })

  test('should default port to 3004 if not provided in environment variable', async () => {
    delete process.env.PORT
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('port')).toBe(3004)
  })

  test('should throw error if port is not a number', async () => {
    process.env.PORT = 'invalid-port'
    await expect(async () => await import('../../../src/config/config.js')).rejects.toThrow()
  })

  test('should throw error if port is not a valid port number', async () => {
    process.env.PORT = '99999'
    await expect(async () => await import('../../../src/config/config.js')).rejects.toThrow()
  })

  test('should return service name with default value', async () => {
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('serviceName')).toBe('fcp-audit')
  })

  test('should return service version from environment variable', async () => {
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('serviceVersion')).toBe('1.0.0')
  })

  test('should return null service version if not provided in environment variable', async () => {
    delete process.env.SERVICE_VERSION
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('serviceVersion')).toBeNull()
  })

  test('should return cdp environment from environment variable', async () => {
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('cdpEnvironment')).toBe('dev')
  })

  test('should default cdp environment to local if not provided in environment variable', async () => {
    delete process.env.ENVIRONMENT
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('cdpEnvironment')).toBe('local')
  })

  test('should return log enabled from environment variable', async () => {
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('log.isEnabled')).toBe(true)
  })

  test('should default log enabled to true for non-test environments', async () => {
    process.env.NODE_ENV = 'development'
    delete process.env.LOG_ENABLED
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('log.isEnabled')).toBe(true)
  })

  test('should return log level from environment variable', async () => {
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('log.level')).toBe('debug')
  })

  test('should default log level to info if not provided in environment variable', async () => {
    delete process.env.LOG_LEVEL
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('log.level')).toBe('info')
  })

  test('should return log format from environment variable', async () => {
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('log.format')).toBe('ecs')
  })

  test('should default log format to pino-pretty for non-production environments', async () => {
    process.env.NODE_ENV = 'development'
    delete process.env.LOG_FORMAT
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('log.format')).toBe('pino-pretty')
  })

  test('should return http proxy from environment variable', async () => {
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('httpProxy')).toBe('http://proxy:8080')
  })

  test('should return null http proxy if not provided in environment variable', async () => {
    delete process.env.HTTP_PROXY
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('httpProxy')).toBeNull()
  })

  test('should return secure context enabled from environment variable', async () => {
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('isSecureContextEnabled')).toBe(true)
  })

  test('should default secure context enabled to false for non-production environments', async () => {
    process.env.NODE_ENV = 'development'
    delete process.env.ENABLE_SECURE_CONTEXT
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('isSecureContextEnabled')).toBe(false)
  })

  test('should return metrics enabled from environment variable', async () => {
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('isMetricsEnabled')).toBe(true)
  })

  test('should default metrics enabled to false for non-production environments', async () => {
    process.env.NODE_ENV = 'development'
    delete process.env.ENABLE_METRICS
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('isMetricsEnabled')).toBe(false)
  })

  test('should return tracing header from environment variable', async () => {
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('tracing.header')).toBe('x-custom-trace-id')
  })

  test('should default tracing header to x-cdp-request-id if not provided in environment variable', async () => {
    delete process.env.TRACING_HEADER
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('tracing.header')).toBe('x-cdp-request-id')
  })

  test('should return auth enabled from environment variable', async () => {
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('auth.enabled')).toBe(false)
  })

  test('should default auth enabled to true if not provided in environment variable', async () => {
    delete process.env.AUTH_ENABLED
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('auth.enabled')).toBe(true)
  })

  test('should return auth tenant from environment variable', async () => {
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('auth.tenant')).toBe('test-tenant-123')
  })

  test('should return null auth tenant if not provided in environment variable', async () => {
    delete process.env.AUTH_TENANT_ID
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('auth.tenant')).toBeNull()
  })

  test('should default auth allowed group IDs to empty array if not provided in environment variable', async () => {
    delete process.env.AUTH_ALLOWED_GROUP_IDS
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('auth.allowedGroupIds')).toEqual([])
  })

  test('should parse single auth allowed group ID from environment variable', async () => {
    process.env.AUTH_ALLOWED_GROUP_IDS = 'abcdef12-3456-7890-abcd-ef1234567890'
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('auth.allowedGroupIds')).toEqual(['abcdef12-3456-7890-abcd-ef1234567890'])
  })

  test('should throw error if auth allowed group IDs format is invalid', async () => {
    process.env.AUTH_ALLOWED_GROUP_IDS = 'invalid-format'
    await expect(async () => await import('../../../src/config/config.js')).rejects.toThrow()
  })

  test('should return empty array for empty string auth allowed group IDs', async () => {
    process.env.AUTH_ALLOWED_GROUP_IDS = ''
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('auth.allowedGroupIds')).toEqual([])
  })

  test('should throw error for invalid UUID format in single group ID', async () => {
    process.env.AUTH_ALLOWED_GROUP_IDS = '12345678-1234-1234-1234-12345678901'
    await expect(async () => await import('../../../src/config/config.js')).rejects.toThrow('Must be a comma separated list of valid UUIDs')
  })

  test('should throw error for invalid UUID format with extra characters', async () => {
    process.env.AUTH_ALLOWED_GROUP_IDS = '12345678-1234-1234-1234-123456789012x'
    await expect(async () => await import('../../../src/config/config.js')).rejects.toThrow('Must be a comma separated list of valid UUIDs')
  })

  test('should throw error for UUID with missing hyphens', async () => {
    process.env.AUTH_ALLOWED_GROUP_IDS = '12345678123412341234123456789012'
    await expect(async () => await import('../../../src/config/config.js')).rejects.toThrow('Must be a comma separated list of valid UUIDs')
  })

  test('should throw error for UUID with wrong hyphen positions', async () => {
    process.env.AUTH_ALLOWED_GROUP_IDS = '123456781-234-1234-1234-123456789012'
    await expect(async () => await import('../../../src/config/config.js')).rejects.toThrow('Must be a comma separated list of valid UUIDs')
  })

  test('should accept uppercase UUIDs', async () => {
    process.env.AUTH_ALLOWED_GROUP_IDS = '12345678-1234-1234-1234-123456789ABC'
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('auth.allowedGroupIds')).toEqual(['12345678-1234-1234-1234-123456789ABC'])
  })

  test('should accept mixed case UUIDs', async () => {
    process.env.AUTH_ALLOWED_GROUP_IDS = '12345678-1234-1234-1234-123456789abC'
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('auth.allowedGroupIds')).toEqual(['12345678-1234-1234-1234-123456789abC'])
  })

  test('should throw error for comma-separated list with invalid UUID in middle', async () => {
    process.env.AUTH_ALLOWED_GROUP_IDS = '12345678-1234-1234-1234-123456789012,invalid,87654321-4321-4321-4321-210987654321'
    await expect(async () => await import('../../../src/config/config.js')).rejects.toThrow('Must be a comma separated list of valid UUIDs')
  })

  test('should handle leading comma in group IDs', async () => {
    process.env.AUTH_ALLOWED_GROUP_IDS = ',12345678-1234-1234-1234-123456789012'
    await expect(async () => await import('../../../src/config/config.js')).rejects.toThrow('Must be a comma separated list of valid UUIDs')
  })

  test('should handle trailing comma in group IDs', async () => {
    process.env.AUTH_ALLOWED_GROUP_IDS = '12345678-1234-1234-1234-123456789012,'
    await expect(async () => await import('../../../src/config/config.js')).rejects.toThrow('Must be a comma separated list of valid UUIDs')
  })

  test('should handle double comma in group IDs', async () => {
    process.env.AUTH_ALLOWED_GROUP_IDS = '12345678-1234-1234-1234-123456789012,,12345678-1234-1234-1234-123456789013'
    await expect(async () => await import('../../../src/config/config.js')).rejects.toThrow('Must be a comma separated list of valid UUIDs')
  })

  test('should throw error for string with spaces', async () => {
    process.env.AUTH_ALLOWED_GROUP_IDS = '12345678-1234-1234-1234-123456789012, 87654321-4321-4321-4321-210987654321'
    await expect(async () => await import('../../../src/config/config.js')).rejects.toThrow('Must be a comma separated list of valid UUIDs')
  })

  test('should convert single UUID string to array', async () => {
    process.env.AUTH_ALLOWED_GROUP_IDS = '12345678-1234-1234-1234-123456789012'
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('auth.allowedGroupIds')).toEqual(['12345678-1234-1234-1234-123456789012'])
  })

  test('should accept multiple valid UUIDs', async () => {
    process.env.AUTH_ALLOWED_GROUP_IDS = '12345678-1234-1234-1234-123456789012,87654321-4321-4321-4321-210987654321,abcdef12-3456-7890-abcd-ef1234567890'
    const { config } = await import('../../../src/config/config.js')
    expect(config.get('auth.allowedGroupIds')).toEqual([
      '12345678-1234-1234-1234-123456789012',
      '87654321-4321-4321-4321-210987654321',
      'abcdef12-3456-7890-abcd-ef1234567890'
    ])
  })

  test('should coerce array values unchanged', async () => {
    delete process.env.AUTH_ALLOWED_GROUP_IDS
    const { config } = await import('../../../src/config/config.js')
    expect(Array.isArray(config.get('auth.allowedGroupIds'))).toBe(true)
    expect(config.get('auth.allowedGroupIds')).toEqual([])
  })

  test('should test array validation with invalid UUID in default', async () => {
    const convict = await import('convict')

    expect(() => {
      const testConfig = convict.default({
        testField: {
          format: 'security-group-array',
          default: ['invalid-uuid']
        }
      })
      testConfig.validate()
    }).toThrow('Must be a comma separated list of valid UUIDs')
  })

  test('should test array validation with mixed valid and invalid UUIDs', async () => {
    const convict = await import('convict')

    expect(() => {
      const testConfig = convict.default({
        testField: {
          format: 'security-group-array',
          default: ['12345678-1234-1234-1234-123456789012', 'invalid-uuid']
        }
      })
      testConfig.validate()
    }).toThrow('Must be a comma separated list of valid UUIDs')
  })

  test('should test array validation with valid UUIDs', async () => {
    const convict = await import('convict')

    const testConfig = convict.default({
      testField: {
        format: 'security-group-array',
        default: ['12345678-1234-1234-1234-123456789012', '87654321-4321-4321-4321-210987654321']
      }
    })
    testConfig.validate()
    expect(testConfig.get('testField')).toEqual([
      '12345678-1234-1234-1234-123456789012',
      '87654321-4321-4321-4321-210987654321'
    ])
  })

  test('should handle string that matches overall pattern but has invalid structure', async () => {
    process.env.AUTH_ALLOWED_GROUP_IDS = '12345678-1234-1234-1234-123456789012,12345678-1234-1234-1234-12345678901z'
    await expect(async () => await import('../../../src/config/config.js')).rejects.toThrow('Must be a comma separated list of valid UUIDs')
  })
})
