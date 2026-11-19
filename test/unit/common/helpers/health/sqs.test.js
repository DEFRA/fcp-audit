import { beforeEach, describe, expect, test, vi } from 'vitest'
import { GetQueueAttributesCommand } from '@aws-sdk/client-sqs'

const mockSend = vi.fn()
const mockGetConfig = vi.fn()
const mockLogInfo = vi.fn()
const mockLogError = vi.fn()

vi.mock('../../../../../src/common/helpers/sqs.js', () => ({
  sqsClient: { send: mockSend }
}))

vi.mock('../../../../../src/config/config.js', () => ({
  config: { get: mockGetConfig }
}))

vi.mock('../../../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: mockLogInfo, error: mockLogError })
}))

const { healthCheck } = await import('../../../../../src/common/helpers/health/sqs.js')

const queueUrl = 'http://localhost:4566/000000000000/test-queue'

describe('sqs health check', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetConfig.mockReturnValue(queueUrl)
    mockSend.mockResolvedValue({
      Attributes: { QueueArn: 'arn:aws:sqs:eu-west-2:000000000000:test-queue' }
    })
  })

  test('should read queue attributes without consuming messages', async () => {
    await expect(healthCheck()).resolves.toBeUndefined()

    expect(mockGetConfig).toHaveBeenCalledWith('aws.sqs.queueUrl')
    expect(mockSend).toHaveBeenCalledOnce()

    const command = mockSend.mock.calls[0][0]
    expect(command).toBeInstanceOf(GetQueueAttributesCommand)
    expect(command.input).toEqual({
      QueueUrl: queueUrl,
      AttributeNames: ['QueueArn']
    })
    expect(mockLogInfo).toHaveBeenCalledWith('SUCCESS: Connected to SQS queue')
    expect(mockLogError).not.toHaveBeenCalled()
  })

  test.each([undefined, null, ''])(
    'should reject without calling SQS when queue URL is %s',
    async (value) => {
      mockGetConfig.mockReturnValueOnce(value)

      await expect(healthCheck()).rejects.toThrow('AWS_SQS_QUEUE_URL is not set')

      expect(mockSend).not.toHaveBeenCalled()
      expect(mockLogError).toHaveBeenCalledWith(
        expect.any(Error),
        'Error connecting to SQS queue'
      )
    }
  )

  test.each([
    ['queue missing', 'AWS.SimpleQueueService.NonExistentQueue'],
    ['access denied', 'AccessDenied'],
    ['network failure', 'connection timeout']
  ])('should log and rethrow when %s', async (_, message) => {
    const error = new Error(message)
    mockSend.mockRejectedValueOnce(error)

    await expect(healthCheck()).rejects.toBe(error)

    expect(mockLogError).toHaveBeenCalledWith(error, 'Error connecting to SQS queue')
    expect(mockLogInfo).not.toHaveBeenCalledWith('SUCCESS: Connected to SQS queue')
  })
})
