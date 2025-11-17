import { vi, describe, beforeEach, test, expect } from 'vitest'

const mockParseEvent = vi.fn()

vi.mock('../../../src/events/parse.js', () => ({
  parseEvent: mockParseEvent
}))

const mockValidateEvent = vi.fn()

vi.mock('../../../src/events/validate.js', () => ({
  validateEvent: mockValidateEvent
}))

const mockSaveEvent = vi.fn()

vi.mock('../../../src/events/audit.js', () => ({
  saveEvent: mockSaveEvent
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

    expect(mockSaveEvent).not.toHaveBeenCalled()
  })
})
