import { vi, describe, beforeEach, test, expect } from 'vitest'

const mockLoggerInfo = vi.fn()

vi.mock('../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: (...args) => mockLoggerInfo(...args) })
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
  Body: JSON.stringify({
    Message: JSON.stringify(testEvent)
  })
}

describe('processEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParseEvent.mockReturnValue(testEvent)
    mockTransformEvent.mockReturnValue({ auditEvent: testEvent, socEvent: testEvent })
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

  test('should abandon processing if parsing fails', async () => {
    const parseError = new Error('Test parsing error')

    mockParseEvent.mockImplementationOnce(() => {
      throw parseError
    })

    await expect(processEvent(testRawEvent)).rejects.toThrow(parseError)

    expect(mockValidateEvent).not.toHaveBeenCalled()
    expect(mockSaveEvent).not.toHaveBeenCalled()
  })

  test('should abandon processing if validation fails', async () => {
    const validationError = new Error('Test validation error')

    mockValidateEvent.mockImplementationOnce(() => {
      throw validationError
    })

    await expect(processEvent(testRawEvent)).rejects.toThrow(validationError)

    expect(mockTransformEvent).not.toHaveBeenCalled()
    expect(mockSaveEvent).not.toHaveBeenCalled()
    expect(mockSentToSoc).not.toHaveBeenCalled()
  })

  test('should abandon processing if transform fails', async () => {
    const transformError = new Error('Test transform error')

    mockTransformEvent.mockImplementationOnce(() => {
      throw transformError
    })

    await expect(processEvent(testRawEvent)).rejects.toThrow(transformError)

    expect(mockSaveEvent).not.toHaveBeenCalled()
    expect(mockSentToSoc).not.toHaveBeenCalled()
  })

  test('should abandon processing if save fails', async () => {
    const saveError = new Error('Test save error')

    mockSaveEvent.mockImplementationOnce(() => {
      throw saveError
    })

    await expect(processEvent(testRawEvent)).rejects.toThrow(saveError)

    expect(mockSentToSoc).not.toHaveBeenCalled()
  })
})
