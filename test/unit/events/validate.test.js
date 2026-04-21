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
    mockSchemaValidate.mockReturnValue({ error: null, value: testEvent })
    await validateEvent(testEvent)
    expect(mockSchemaValidate).toHaveBeenCalledWith(testEvent, { abortEarly: false, allowUnknown: true })
  })

  test('should throw error if event validation fails', async () => {
    const validationError = new Error('Validation failed')
    mockSchemaValidate.mockReturnValueOnce({ error: validationError })

    await expect(validateEvent(testEvent)).rejects.toThrow(`Event is invalid, ${validationError.message}`)
  })

  test('should remove null security property after validation', async () => {
    const event = {
      ...testEvent,
      security: null,
      audit: { eventtype: 'test' }
    }
    mockSchemaValidate.mockReturnValue({ error: null, value: { ...event } })

    await validateEvent(event)

    expect(event.security).toBeUndefined()
    expect(event.audit).toBeDefined()
  })

  test('should remove null audit property after validation', async () => {
    const event = {
      ...testEvent,
      audit: null,
      security: { pmccode: '1234' }
    }
    mockSchemaValidate.mockReturnValue({ error: null, value: { ...event } })

    await validateEvent(event)

    expect(event.audit).toBeUndefined()
    expect(event.security).toBeDefined()
  })

  test('should not remove non-null security property', async () => {
    const event = {
      ...testEvent,
      security: { pmccode: '1234', priority: 1 },
      audit: { eventtype: 'test' }
    }
    mockSchemaValidate.mockReturnValue({ error: null, value: { ...event } })

    await validateEvent(event)

    expect(event.security).toBeDefined()
    expect(event.security.pmccode).toBe('1234')
  })

  test('should not remove non-null audit property', async () => {
    const event = {
      ...testEvent,
      audit: { eventtype: 'test' },
      security: { pmccode: '1234' }
    }
    mockSchemaValidate.mockReturnValue({ error: null, value: { ...event } })

    await validateEvent(event)

    expect(event.audit).toBeDefined()
    expect(event.audit.eventtype).toBe('test')
  })

  test('should handle event with both security and audit as non-null', async () => {
    const event = {
      ...testEvent,
      security: { pmccode: '1234', priority: 1 },
      audit: { eventtype: 'test' }
    }
    mockSchemaValidate.mockReturnValue({ error: null, value: { ...event } })

    await validateEvent(event)

    expect(event.security).toBeDefined()
    expect(event.audit).toBeDefined()
  })
})
