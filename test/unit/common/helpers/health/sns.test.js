import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockPublishAuditEvent = vi.fn()
const mockGetPublisherConfig = vi.fn()
const mockLogInfo = vi.fn()
const mockLogError = vi.fn()

vi.mock('@defra/fcp-audit-publisher', () => ({
  publishAuditEvent: mockPublishAuditEvent
}))

vi.mock('../../../../../src/plugins/api-audit.js', () => ({
  getPublisherConfig: mockGetPublisherConfig
}))

vi.mock('../../../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: mockLogInfo, error: mockLogError })
}))

const { healthCheck } = await import('../../../../../src/common/helpers/health/sns.js')

const topicArn = 'arn:aws:sns:eu-west-2:000000000000:audit-topic'
const publisherConfig = {
  sns: { topicArn }
}

describe('sns health check', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetPublisherConfig.mockReturnValue(publisherConfig)
    mockPublishAuditEvent.mockResolvedValue({ messageId: 'message-123' })
  })

  test('should publish a startup audit event', async () => {
    await expect(healthCheck()).resolves.toBeUndefined()

    expect(mockPublishAuditEvent).toHaveBeenCalledExactlyOnceWith(
      {
        ip: '127.0.0.1',
        user: 'startup-healthcheck',
        audit: {
          entities: [{
            entity: 'audit',
            action: 'created',
            entityid: 'fcp-audit startup healthcheck'
          }],
          status: 'success'
        }
      },
      publisherConfig
    )
    expect(mockLogInfo).toHaveBeenCalledWith(
      'SUCCESS: Published startup audit event to SNS: messageId=message-123'
    )
    expect(mockLogError).not.toHaveBeenCalled()
  })

  test.each([undefined, null, ''])(
    'should reject without publishing when topic ARN is %s',
    async (value) => {
      mockGetPublisherConfig.mockReturnValueOnce({
        sns: { topicArn: value }
      })

      await expect(healthCheck()).rejects.toThrow(
        'AUDIT_INTERNAL_PUBLISH_SNS_TOPIC_ARN is not set'
      )

      expect(mockPublishAuditEvent).not.toHaveBeenCalled()
      expect(mockLogError).toHaveBeenCalledWith(
        expect.any(Error),
        'Error publishing startup audit event to SNS'
      )
    }
  )

  test.each([
    ['topic not found', 'NotFound'],
    ['access denied', 'AuthorizationError'],
    ['network failure', 'network timeout']
  ])('should log and rethrow when %s', async (_, message) => {
    const error = new Error(message)
    mockPublishAuditEvent.mockRejectedValueOnce(error)

    await expect(healthCheck()).rejects.toBe(error)

    expect(mockLogError).toHaveBeenCalledWith(
      error,
      'Error publishing startup audit event to SNS'
    )
    expect(mockLogInfo).not.toHaveBeenCalledWith(
      expect.stringContaining('SUCCESS:')
    )
  })
})
