import { vi, describe, beforeEach, test, expect } from 'vitest'
import { Writable } from 'node:stream'
import { pino } from 'pino'

/* 
Using an actual pino instance for these tests so it is possible to check the context added to log messages,
rather then just the context passed in at the time the message was logged.
*/
const logs = []

const stream = new Writable({
  write(chunk, encoding, callback) {
    // Pino logs JSON strings ending with newline
    logs.push(JSON.parse(chunk.toString()))
    callback()
  }
})

const logger = pino({ level: 'trace' }, stream)

vi.mock('../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => logger
}))

const mockParseEvent = vi.fn()

vi.mock('../../../src/events/parse.js', () => ({
  parseEvent: mockParseEvent
}))

const mockValidateEvent = vi.fn()

vi.mock('../../../src/events/validate.js', () => ({
  validateEvent: mockValidateEvent
}))

const mockTransformEvent = vi.fn()

vi.mock('../../../src/events/transform.js', () => ({
  transformEvent: mockTransformEvent
}))

const mockSaveEvent = vi.fn()

vi.mock('../../../src/events/save.js', () => ({
  saveEvent: mockSaveEvent
}))

const mockSentToSoc = vi.fn()

vi.mock('../../../src/events/soc.js', () => ({
  sentToSoc: mockSentToSoc
}))

const { processEvent } = await import('../../../src/events/process.js')

const testEvent = {
  type: 'uk.gov.defra.fcp.event'
}

const testRawEvent = {
  MessageId: 'test-message-id',
  Body: JSON.stringify({
    Message: JSON.stringify(testEvent)
  })
}

const createRawTestEvent = (message) => {
  return {
    MessageId: 'test-message-id',
    Body: JSON.stringify({
      Message: JSON.stringify(message)
    })
  }
}

describe('processEvent', () => {
  beforeEach(() => {
    logs.length = 0
    vi.clearAllMocks()
    mockParseEvent.mockReturnValue(testEvent)
    mockTransformEvent.mockReturnValue({
      auditEvent: testEvent,
      socEvent: testEvent
    })
  })

  test('should parse raw event into JSON', async () => {
    await processEvent(testRawEvent)
    expect(mockParseEvent).toHaveBeenCalledWith(testRawEvent)
  })

  test('should validate the event payload specific to the event type', async () => {
    await processEvent(testRawEvent)
    expect(mockValidateEvent).toHaveBeenCalledWith(testEvent)
  })

  test('should save the event payload specific to the event type', async () => {
    await processEvent(testRawEvent)
    expect(mockSaveEvent).toHaveBeenCalledWith(testEvent)
  })

  test('should transform the event into auditEvent and socEvent', async () => {
    await processEvent(testRawEvent)
    expect(mockTransformEvent).toHaveBeenCalledWith(testEvent)
  })

  test('should save the audit event to database', async () => {
    const auditEvent = { audit: 'event' }
    const socEvent = { soc: 'event' }
    mockTransformEvent.mockReturnValue({ auditEvent, socEvent })

    await processEvent(testRawEvent)

    expect(mockSaveEvent).toHaveBeenCalledWith(auditEvent)
  })

  test('should send SOC event to SOC', async () => {
    const auditEvent = { audit: 'event' }
    const socEvent = { soc: 'event' }
    mockTransformEvent.mockReturnValue({ auditEvent, socEvent })

    await processEvent(testRawEvent)

    expect(mockSentToSoc).toHaveBeenCalledWith(socEvent)
  })

  test('should log success with SQS message id', async () => {
    await processEvent(testRawEvent)

    expect(logs[0]).toEqual(
      expect.objectContaining({
        level: 30, // an info message
        event: { reference: 'test-message-id' },
        msg: 'Event processed successfully'
      })
    )
  })

  test('should abandon processing if parsing fails', async () => {
    const parseError = new Error('Test parsing error')

    mockParseEvent.mockImplementationOnce(() => {
      throw parseError
    })

    const result = await processEvent(testRawEvent)
    await expect(result).toEqual(false)

    expect(mockValidateEvent).not.toHaveBeenCalled()
    expect(mockSaveEvent).not.toHaveBeenCalled()
    expect(logs[0]).toEqual(
      expect.objectContaining({
        level: 50, // an error message
        err: expect.objectContaining({
          message: parseError.message
        }),
        msg: 'Unable to process event'
      })
    )
  })

  test('should log an error and return false if validation fails', async () => {
    const validationError = new Error('Test validation error')

    mockValidateEvent.mockImplementationOnce(() => {
      throw validationError
    })

    const result = await processEvent(testRawEvent)
    await expect(result).toEqual(false)

    expect(mockTransformEvent).not.toHaveBeenCalled()
    expect(mockSaveEvent).not.toHaveBeenCalled()
    expect(mockSentToSoc).not.toHaveBeenCalled()
    expect(logs[0]).toEqual(
      expect.objectContaining({
        level: 50, // an error message
        err: expect.objectContaining({
          message: validationError.message
        }),
        msg: 'Unable to process event'
      })
    )
  })

  test('should log an error and return false if transform fails', async () => {
    const transformError = new Error('Test transform error')

    mockTransformEvent.mockImplementationOnce(() => {
      throw transformError
    })

    const result = await processEvent(testRawEvent)
    await expect(result).toEqual(false)

    expect(mockSaveEvent).not.toHaveBeenCalled()
    expect(mockSentToSoc).not.toHaveBeenCalled()
    expect(logs[0]).toEqual(
      expect.objectContaining({
        level: 50, // an error message
        err: expect.objectContaining({
          message: transformError.message
        }),
        msg: 'Unable to process event'
      })
    )
  })

  test('should log an error and return false if save fails', async () => {
    const saveError = new Error('Test save error')

    mockSaveEvent.mockImplementationOnce(() => {
      throw saveError
    })
    const result = await processEvent(testRawEvent)
    await expect(result).toEqual(false)

    expect(mockSentToSoc).not.toHaveBeenCalled()
    expect(logs).toHaveLength(1)
    expect(logs[0]).toEqual(
      expect.objectContaining({
        level: 50, // an error message
        err: expect.objectContaining({
          message: saveError.message
        }),
        msg: 'Unable to process event'
      })
    )
  })

  test.each([
    {
      parsedEventFieldLabel: 'environment',
      parsedEventField: {
        environment: 'local'
      },
      expectedLogFieldLabel: 'event/category',
      expectedLogFields: {
        event: { reference: 'test-message-id', category: 'local' }
      }
    },
    {
      parsedEventFieldLabel: 'component',
      parsedEventField: {
        component: 'fcp-sfd-frontend'
      },
      expectedLogFieldLabel: 'tenant/message',
      expectedLogFields: {
        tenant: {
          message: 'fcp-sfd-frontend'
        }
      }
    },
    {
      parsedEventFieldLabel: 'application',
      parsedEventField: {
        application: 'Single Front Door'
      },
      expectedLogFieldLabel: 'tenant/id',
      expectedLogFields: {
        tenant: {
          id: 'Single Front Door'
        }
      }
    },
    {
      parsedEventFieldLabel: 'datetime',
      parsedEventField: {
        datetime: '2026-07-29T11:01:00Z'
      },
      expectedLogFieldLabel: 'event/created',
      expectedLogFields: {
        event: {
          created: '2026-07-29T11:01:00Z',
          reference: 'test-message-id'
        }
      }
    },
    {
      parsedEventFieldLabel: 'correlationid',
      parsedEventField: {
        correlationid: 124
      },
      expectedLogFieldLabel: 'labels/CorrelationId',
      expectedLogFields: {
        labels: {
          CorrelationId: 124
        }
      }
    }
  ])(
    'should log an error with $expectedLogFieldLabel when the invalid event has $parsedEventFieldLabel',
    async ({ parsedEventField, expectedLogFields }) => {
      const saveError = new Error('Test save error')
      mockSaveEvent.mockImplementationOnce(() => {
        throw saveError
      })
      const parsedEvent = { ...testEvent, ...parsedEventField }
      mockParseEvent.mockReturnValue(parsedEvent)
      const result = await processEvent(createRawTestEvent(parsedEvent))
      await expect(result).toEqual(false)

      expect(mockSentToSoc).not.toHaveBeenCalled()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toEqual(
        expect.objectContaining({
          ...expectedLogFields
        })
      )
    }
  )
})
