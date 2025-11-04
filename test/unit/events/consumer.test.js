import { vi, describe, beforeEach, test, expect } from 'vitest'

const mockSqsClient = {
  send: vi.fn()
}

const mockProcessEvent = vi.fn()

vi.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: vi.fn(() => mockSqsClient),
  ReceiveMessageCommand: vi.fn((params) => ({ params })),
  DeleteMessageBatchCommand: vi.fn((params) => ({ params }))
}))

vi.mock('../../../src/events/process.js', () => ({
  processEvent: mockProcessEvent
}))

vi.mock('../../../src/config/config.js', () => ({
  config: {
    get: (key) => {
      if (key === 'aws') {
        return {
          sqs: {
            queueUrl: 'http://localhost:4566/000000000000/test-queue'
          },
          region: 'eu-west-2',
          endpoint: 'http://localhost:4566',
          accessKeyId: 'test',
          secretAccessKey: 'test'
        }
      }
      return null
    }
  }
}))

const mockLogError = vi.fn()

vi.mock('../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    error: mockLogError
  })
}))

const { consumeEvents } = await import('../../../src/events/consumer.js')

describe('consumeEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should check for new events as SQS messages', async () => {
    mockSqsClient.send.mockResolvedValueOnce({ Messages: [] })
    const result = await consumeEvents()
    expect(result).toBe(false)
    expect(mockSqsClient.send).toHaveBeenCalledTimes(1)
    expect(mockSqsClient.send).toHaveBeenCalledWith(expect.objectContaining({
      params: expect.objectContaining({
        QueueUrl: 'http://localhost:4566/000000000000/test-queue',
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 10,
      })
    }))
  })

  test('should not process events if no event messages are received', async () => {
    mockSqsClient.send.mockResolvedValueOnce({ Messages: null })
    const result = await consumeEvents()
    expect(result).toBe(false)
    expect(mockProcessEvent).not.toHaveBeenCalled()
    expect(mockSqsClient.send).toHaveBeenCalledTimes(1)
  })

  test('should process single event if one message received', async () => {
    const testMessages = [
      { MessageId: 'id-1', ReceiptHandle: 'receipt-1', Body: 'message-1' }
    ]
    mockSqsClient.send
      .mockResolvedValueOnce({ Messages: testMessages }) // ReceiveMessageCommand
      .mockResolvedValueOnce({}) // DeleteMessageBatchCommand
    const result = await consumeEvents()
    expect(result).toBe(true)
    expect(mockSqsClient.send).toHaveBeenCalledTimes(2)
    expect(mockProcessEvent).toHaveBeenCalledTimes(1)
    expect(mockProcessEvent).toHaveBeenCalledWith(testMessages[0])
    expect(mockSqsClient.send).toHaveBeenNthCalledWith(2, expect.objectContaining({
      params: expect.objectContaining({
        QueueUrl: 'http://localhost:4566/000000000000/test-queue',
        Entries: [
          { Id: 'id-1', ReceiptHandle: 'receipt-1' }
        ]
      })
    }))
  })

  test('should batch delete message from SQS after successful processing', async () => {
    const testMessage = { MessageId: 'id-1', ReceiptHandle: 'receipt-1', Body: 'message-1' }
    mockSqsClient.send
      .mockResolvedValueOnce({ Messages: [testMessage] }) // ReceiveMessageCommand
      .mockResolvedValueOnce({}) // DeleteMessageBatchCommand
    const result = await consumeEvents()
    expect(result).toBe(true)
    expect(mockSqsClient.send).toHaveBeenCalledTimes(2)
    expect(mockSqsClient.send).toHaveBeenNthCalledWith(2, expect.objectContaining({
      params: expect.objectContaining({
        QueueUrl: 'http://localhost:4566/000000000000/test-queue',
        Entries: [
          { Id: 'id-1', ReceiptHandle: 'receipt-1' }
        ]
      })
    }))
  })

  test('should process multiple events if multiple messages received', async () => {
    const testMessages = [
      { MessageId: 'id-1', ReceiptHandle: 'receipt-1', Body: 'message-1' },
      { MessageId: 'id-2', ReceiptHandle: 'receipt-2', Body: 'message-2' }
    ]
    mockSqsClient.send
      .mockResolvedValueOnce({ Messages: testMessages }) // ReceiveMessageCommand
      .mockResolvedValueOnce({}) // DeleteMessageBatchCommand after first event
    const result = await consumeEvents()
    expect(result).toBe(true)
    expect(mockSqsClient.send).toHaveBeenCalledTimes(2)
    expect(mockProcessEvent).toHaveBeenCalledTimes(2)
    expect(mockProcessEvent).toHaveBeenCalledWith(testMessages[0])
    expect(mockProcessEvent).toHaveBeenCalledWith(testMessages[1])
    expect(mockSqsClient.send.mock.calls[1][0].params).toEqual({
      QueueUrl: 'http://localhost:4566/000000000000/test-queue',
      Entries: [
        { Id: 'id-1', ReceiptHandle: 'receipt-1' },
        { Id: 'id-2', ReceiptHandle: 'receipt-2' }
      ]
    })
  })

  test('should batch delete multiple messages from SQS after successful processing', async () => {
    const testMessages = [
      { MessageId: 'id-1', ReceiptHandle: 'receipt-1', Body: 'message-1' },
      { MessageId: 'id-2', ReceiptHandle: 'receipt-2', Body: 'message-2' }
    ]
    mockSqsClient.send
      .mockResolvedValueOnce({ Messages: testMessages }) // ReceiveMessageCommand
      .mockResolvedValueOnce({}) // DeleteMessageBatchCommand after events
    const result = await consumeEvents()
    expect(result).toBe(true)
    expect(mockSqsClient.send).toHaveBeenCalledTimes(2)
    expect(mockSqsClient.send.mock.calls[1][0].params).toEqual({
      QueueUrl: 'http://localhost:4566/000000000000/test-queue',
      Entries: [
        { Id: 'id-1', ReceiptHandle: 'receipt-1' },
        { Id: 'id-2', ReceiptHandle: 'receipt-2' }
      ]
    })
  })

  test('should log error and continue processing other events when processing fails', async () => {
    const testMessages = [
      { MessageId: 'id-1', ReceiptHandle: 'receipt-1', Body: 'message-1' },
      { MessageId: 'id-2', ReceiptHandle: 'receipt-2', Body: 'message-2' }
    ]
    const processError = new Error('Processing failed')
    mockSqsClient.send.mockResolvedValueOnce({ Messages: testMessages })
    mockProcessEvent
      .mockRejectedValueOnce(processError) // First message fails
      .mockResolvedValueOnce() // Second message succeeds
    const result = await consumeEvents()
    expect(result).toBe(true)
    expect(mockProcessEvent).toHaveBeenCalledTimes(2)
    expect(mockLogError).toHaveBeenCalledWith(processError, 'Unable to process event')
    expect(mockSqsClient.send).toHaveBeenCalledTimes(2) // One receive, one delete
    expect(mockSqsClient.send.mock.calls[1][0].params).toEqual({
      QueueUrl: 'http://localhost:4566/000000000000/test-queue',
      Entries: [
        { Id: 'id-2', ReceiptHandle: 'receipt-2' }
      ]
    })
  })

  test('should not delete message when processing fails', async () => {
    const testMessage = { MessageId: 'id-1', ReceiptHandle: 'receipt-1', Body: 'message-1' }
    const processError = new Error('Processing failed')
    mockSqsClient.send.mockResolvedValueOnce({ Messages: [testMessage] })
    mockProcessEvent.mockRejectedValueOnce(processError)
    const result = await consumeEvents()
    expect(result).toBe(true)
    expect(mockSqsClient.send).toHaveBeenCalledTimes(1) // One receive, no batch delete
    expect(mockLogError).toHaveBeenCalledWith(processError, 'Unable to process event')
  })
})
