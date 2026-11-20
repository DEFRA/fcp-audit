import { beforeEach, describe, expect, test, vi } from 'vitest'
import { GetTopicAttributesCommand } from '@aws-sdk/client-sns'

const mockSend = vi.fn()
const mockGetConfig = vi.fn()
const mockLogInfo = vi.fn()
const mockLogError = vi.fn()

vi.mock('../../../../../src/common/helpers/sns.js', () => ({
  snsClient: { send: mockSend }
}))

vi.mock('../../../../../src/config/config.js', () => ({
  config: { get: mockGetConfig }
}))

vi.mock('../../../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: mockLogInfo, error: mockLogError })
}))

const { healthCheck } = await import('../../../../../src/common/helpers/health/sns.js')

const topicArn = 'arn:aws:sns:eu-west-2:000000000000:audit-topic'

describe('sns health check', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetConfig.mockReturnValue(topicArn)
    mockSend.mockResolvedValue({ Attributes: { TopicArn: topicArn } })
  })

  test('should read topic attributes without publishing a message', async () => {
    await expect(healthCheck()).resolves.toBeUndefined()

    expect(mockGetConfig).toHaveBeenCalledWith('aws.sns.topicArn')
    expect(mockSend).toHaveBeenCalledOnce()

    const command = mockSend.mock.calls[0][0]
    expect(command).toBeInstanceOf(GetTopicAttributesCommand)
    expect(command.input).toEqual({ TopicArn: topicArn })
    expect(mockLogInfo).toHaveBeenCalledWith('SUCCESS: Connected to SNS topic')
    expect(mockLogError).not.toHaveBeenCalled()
  })

  test.each([undefined, null, ''])(
    'should reject without calling SNS when topic ARN is %s',
    async (value) => {
      mockGetConfig.mockReturnValueOnce(value)

      await expect(healthCheck()).rejects.toThrow(
        'AUDIT_INTERNAL_PUBLISH_SNS_TOPIC_ARN is not set'
      )

      expect(mockSend).not.toHaveBeenCalled()
      expect(mockLogError).toHaveBeenCalledWith(
        expect.any(Error),
        'Error connecting to SNS topic'
      )
    }
  )

  test.each([
    ['topic not found', 'NotFound'],
    ['access denied', 'AuthorizationError'],
    ['network failure', 'network timeout']
  ])('should log and rethrow when %s', async (_, message) => {
    const error = new Error(message)
    mockSend.mockRejectedValueOnce(error)

    await expect(healthCheck()).rejects.toBe(error)

    expect(mockLogError).toHaveBeenCalledWith(error, 'Error connecting to SNS topic')
    expect(mockLogInfo).not.toHaveBeenCalledWith('SUCCESS: Connected to SNS topic')
  })

  test('should reject an unexpected topic ARN', async () => {
    mockSend.mockResolvedValueOnce({
      Attributes: { TopicArn: 'arn:aws:sns:eu-west-2:000000000000:other-topic' }
    })

    await expect(healthCheck()).rejects.toThrow(
      'SNS returned an unexpected topic ARN'
    )

    expect(mockLogError).toHaveBeenCalledWith(
      expect.any(Error),
      'Error connecting to SNS topic'
    )
    expect(mockLogInfo).not.toHaveBeenCalledWith('SUCCESS: Connected to SNS topic')
  })

  test.each([{}, { Attributes: {} }])(
    'should reject when topic attributes are missing: %o',
    async (response) => {
      mockSend.mockResolvedValueOnce(response)

      await expect(healthCheck()).rejects.toThrow(
        'SNS returned an unexpected topic ARN'
      )

      expect(mockLogError).toHaveBeenCalledWith(
        expect.any(Error),
        'Error connecting to SNS topic'
      )
      expect(mockLogInfo).not.toHaveBeenCalledWith('SUCCESS: Connected to SNS topic')
    }
  )
})
