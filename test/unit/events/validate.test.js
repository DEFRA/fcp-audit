import { describe, test, expect, beforeEach, vi } from 'vitest'

const mockSchemaValidate = vi.fn()

vi.mock('../../../src/events/schema.js', () => ({
  default: {
    validate: mockSchemaValidate
  }
}))

let validateEvent

const testEvent = {
  eventtype: 'uk.gov.defra.fcp.event'
}

describe('validateEvent', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockSchemaValidate.mockReturnValue({ error: null })
    validateEvent = (await import('../../../src/events/validate.js')).validateEvent
  })

  test('should validate all event payload properties against schema allowing unknown properties', async () => {
    await validateEvent(testEvent)
    expect(mockSchemaValidate).toHaveBeenCalledWith(testEvent, { abortEarly: false, allowUnknown: true })
  })

  test('should throw error if event validation fails', async () => {
    const validationError = new Error('Validation failed')
    mockSchemaValidate.mockReturnValueOnce({ error: validationError })

    await expect(validateEvent(testEvent)).rejects.toThrow(`Event is invalid, ${validationError.message}`)
  })
})
