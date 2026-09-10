import { expect, test, describe, beforeEach, vi } from 'vitest'

const mockConfigGet = vi.fn()
vi.mock('../../../src/config/config.js', () => ({
  config: {
    get: mockConfigGet
  }
}))

const mockPublishAuditEvent = vi.fn()
vi.mock('@defra/fcp-audit-publisher', () => ({
  publishAuditEvent: mockPublishAuditEvent
}))

const mockGetTraceId = vi.fn()
vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: mockGetTraceId
}))

vi.mock('../../../src/common/helpers/sns.js', () => ({
  snsClient: 'mock-sns-client'
}))

const mockLoggerError = vi.fn()
const mockLoggerInfo = vi.fn()
vi.mock('../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ error: mockLoggerError, info: mockLoggerInfo })
}))

function configureMocks ({ topicArn = 'arn:aws:sns:eu-west-2:123456789012:audit-topic' } = {}) {
  mockConfigGet.mockImplementation((key) => {
    switch (key) {
      case 'serviceName':
        return 'fcp-audit'
      case 'cdpEnvironment':
        return 'test'
      case 'aws.sns.topicArn':
        return topicArn
      default:
        return null
    }
  })
}

async function loadPlugin (options) {
  vi.resetModules()
  configureMocks(options)
  const { apiAudit } = await import('../../../src/plugins/api-audit.js')
  return apiAudit
}

function buildRequest ({
  apiAudit = { action: 'search' },
  path = '/audit/search',
  principalId = 'user-123',
  response = { statusCode: 200, isBoom: false },
  query = {},
  remoteAddress = '127.0.0.1',
  headers = {}
} = {}) {
  return {
    route: { path, settings: { plugins: { apiAudit } } },
    path,
    method: 'get',
    auth: { credentials: { principalId } },
    info: { remoteAddress },
    headers,
    response,
    query
  }
}

describe('api-audit plugin', () => {
  let mockServer
  let mockH

  beforeEach(() => {
    vi.clearAllMocks()
    mockServer = { ext: vi.fn() }
    mockH = { continue: 'continue-symbol' }
  })

  test('should have a name', async () => {
    const apiAudit = await loadPlugin()
    expect(apiAudit.plugin.name).toBe('api-audit')
  })

  test('should register an onPreResponse extension', async () => {
    const apiAudit = await loadPlugin()
    apiAudit.plugin.register(mockServer)
    expect(mockServer.ext).toHaveBeenCalledWith('onPreResponse', expect.any(Function))
  })

  test('should always return h.continue immediately without waiting on the publish', async () => {
    mockPublishAuditEvent.mockReturnValue(new Promise(() => {})) // never resolves
    const apiAudit = await loadPlugin()
    apiAudit.plugin.register(mockServer)
    const onPreResponse = mockServer.ext.mock.calls[0][1]

    const request = buildRequest()
    const result = onPreResponse(request, mockH)

    expect(result).toBe('continue-symbol')
  })

  test('should publish an audit event for a tagged audit route', async () => {
    mockPublishAuditEvent.mockResolvedValue({ messageId: 'abc' })
    mockGetTraceId.mockReturnValue('trace-123')
    const apiAudit = await loadPlugin()
    apiAudit.plugin.register(mockServer)
    const onPreResponse = mockServer.ext.mock.calls[0][1]

    const query = { page: 1, pageSize: 20, conditions: [{ field: 'audit.status', operator: 'eq', value: 'success' }] }
    const request = buildRequest({ path: '/audit/search', apiAudit: { action: 'search' }, query })
    onPreResponse(request, mockH)

    expect(mockPublishAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        version: '1.0.0',
        user: 'user-123',
        ip: '127.0.0.1',
        correlationid: 'trace-123',
        audit: expect.objectContaining({
          entities: [{ entity: 'audit', action: 'search' }],
          status: 'success',
          details: { path: '/audit/search', method: 'get', query }
        })
      }),
      expect.objectContaining({
        snsClient: 'mock-sns-client',
        sns: { topicArn: 'arn:aws:sns:eu-west-2:123456789012:audit-topic' },
        application: 'Audit Service',
        component: 'fcp-audit',
        environment: 'cdp-test',
        generateCorrelationId: true
      })
    )
  })

  test('should use the client IP from x-forwarded-for when present, ignoring the proxy remoteAddress', async () => {
    mockPublishAuditEvent.mockResolvedValue({})
    const apiAudit = await loadPlugin()
    apiAudit.plugin.register(mockServer)
    const onPreResponse = mockServer.ext.mock.calls[0][1]

    const request = buildRequest({
      remoteAddress: '127.0.0.1',
      headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }
    })
    onPreResponse(request, mockH)

    expect(mockPublishAuditEvent.mock.calls[0][0].ip).toBe('203.0.113.5')
  })

  test('should fall back to remoteAddress when x-forwarded-for is not present', async () => {
    mockPublishAuditEvent.mockResolvedValue({})
    const apiAudit = await loadPlugin()
    apiAudit.plugin.register(mockServer)
    const onPreResponse = mockServer.ext.mock.calls[0][1]

    const request = buildRequest({ remoteAddress: '10.1.2.3', headers: {} })
    onPreResponse(request, mockH)

    expect(mockPublishAuditEvent.mock.calls[0][0].ip).toBe('10.1.2.3')
  })

  test('should omit correlationid rather than send it as undefined when no trace id is present', async () => {
    mockPublishAuditEvent.mockResolvedValue({})
    mockGetTraceId.mockReturnValue(undefined)
    const apiAudit = await loadPlugin()
    apiAudit.plugin.register(mockServer)
    const onPreResponse = mockServer.ext.mock.calls[0][1]

    onPreResponse(buildRequest(), mockH)

    expect(mockPublishAuditEvent.mock.calls[0][0]).not.toHaveProperty('correlationid')
  })

  test.each([
    ['success', '2xx response', { statusCode: 200, isBoom: false }],
    ['success', 'redirect response', { statusCode: 302, isBoom: false }],
    ['failure', '4xx response', { statusCode: 404, isBoom: false }],
    ['failure', '5xx response', { statusCode: 500, isBoom: false }],
    [
      'failure',
      'Boom error response',
      { statusCode: 401, isBoom: true, output: { payload: { statusCode: 401, error: 'Unauthorized', message: 'Invalid credentials' } } }
    ]
  ])('should set audit status to "%s" for a %s', async (status, _desc, response) => {
    mockPublishAuditEvent.mockResolvedValue({})
    const apiAudit = await loadPlugin()
    apiAudit.plugin.register(mockServer)
    const onPreResponse = mockServer.ext.mock.calls[0][1]

    onPreResponse(buildRequest({ response }), mockH)

    expect(mockPublishAuditEvent.mock.calls[0][0].audit.status).toBe(status)
  })

  test('should not include errorDetails in details for a successful response', async () => {
    mockPublishAuditEvent.mockResolvedValue({})
    const apiAudit = await loadPlugin()
    apiAudit.plugin.register(mockServer)
    const onPreResponse = mockServer.ext.mock.calls[0][1]

    onPreResponse(buildRequest({ response: { statusCode: 200, isBoom: false } }), mockH)

    expect(mockPublishAuditEvent.mock.calls[0][0].audit.details).not.toHaveProperty('errorDetails')
  })

  test('should include Boom error details in details.errorDetails for a failed response', async () => {
    mockPublishAuditEvent.mockResolvedValue({})
    const apiAudit = await loadPlugin()
    apiAudit.plugin.register(mockServer)
    const onPreResponse = mockServer.ext.mock.calls[0][1]

    const response = {
      statusCode: 400,
      isBoom: true,
      output: { payload: { statusCode: 400, error: 'Bad Request', message: '"page" must be a positive number' } }
    }
    onPreResponse(buildRequest({ response }), mockH)

    expect(mockPublishAuditEvent.mock.calls[0][0].audit.details.errorDetails).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: '"page" must be a positive number'
    })
  })

  test('should include a minimal errorDetails for a non-Boom error response', async () => {
    mockPublishAuditEvent.mockResolvedValue({})
    const apiAudit = await loadPlugin()
    apiAudit.plugin.register(mockServer)
    const onPreResponse = mockServer.ext.mock.calls[0][1]

    onPreResponse(buildRequest({ response: { statusCode: 500, isBoom: false } }), mockH)

    expect(mockPublishAuditEvent.mock.calls[0][0].audit.details.errorDetails).toEqual({ statusCode: 500 })
  })

  test.each([
    ['/audit', 'list'],
    ['/audit/summary', 'summary'],
    ['/audit/search', 'search'],
    ['/audit/download', 'download']
  ])('should use the action configured via route options.plugins.apiAudit for %s', async (path, action) => {
    mockPublishAuditEvent.mockResolvedValue({})
    const apiAudit = await loadPlugin()
    apiAudit.plugin.register(mockServer)
    const onPreResponse = mockServer.ext.mock.calls[0][1]

    onPreResponse(buildRequest({ path, apiAudit: { action } }), mockH)

    expect(mockPublishAuditEvent.mock.calls[0][0].audit.entities[0].action).toBe(action)
  })

  test('should default the audit entity to "audit" when not configured on the route', async () => {
    mockPublishAuditEvent.mockResolvedValue({})
    const apiAudit = await loadPlugin()
    apiAudit.plugin.register(mockServer)
    const onPreResponse = mockServer.ext.mock.calls[0][1]

    onPreResponse(buildRequest({ apiAudit: { action: 'read' } }), mockH)

    expect(mockPublishAuditEvent.mock.calls[0][0].audit.entities[0].entity).toBe('audit')
  })

  test('should use the entity configured via route options.plugins.apiAudit when provided', async () => {
    mockPublishAuditEvent.mockResolvedValue({})
    const apiAudit = await loadPlugin()
    apiAudit.plugin.register(mockServer)
    const onPreResponse = mockServer.ext.mock.calls[0][1]

    onPreResponse(buildRequest({ path: '/audit/summary', apiAudit: { action: 'read', entity: 'audit-summary' } }), mockH)

    expect(mockPublishAuditEvent.mock.calls[0][0].audit.entities[0].entity).toBe('audit-summary')
  })

  test('should not publish for a route with no apiAudit plugin options configured', async () => {
    const apiAudit = await loadPlugin()
    apiAudit.plugin.register(mockServer)
    const onPreResponse = mockServer.ext.mock.calls[0][1]

    const request = buildRequest({ apiAudit: null, path: '/health' })
    onPreResponse(request, mockH)

    expect(mockPublishAuditEvent).not.toHaveBeenCalled()
  })

  test('should log an error when publishing fails', async () => {
    const error = new Error('SNS unavailable')
    mockPublishAuditEvent.mockRejectedValue(error)
    const apiAudit = await loadPlugin()
    apiAudit.plugin.register(mockServer)
    const onPreResponse = mockServer.ext.mock.calls[0][1]

    const request = buildRequest()
    onPreResponse(request, mockH)

    await vi.waitFor(() => {
      expect(mockLoggerError).toHaveBeenCalledWith({ err: error }, 'Failed to publish API audit event')
    })
  })
})
