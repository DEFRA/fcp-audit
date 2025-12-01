import { vi, describe, beforeEach, test, expect } from 'vitest'
import { event as auditEvent } from '../../mocks/event.js'

const mockAudit = vi.fn()

vi.mock('@defra/cdp-auditing', () => ({
  audit: mockAudit
}))

const mockConfig = {
  get: vi.fn()
}

vi.mock('../../../src/config/config.js', () => ({
  config: mockConfig
}))

const { sentToSoc } = await import('../../../src/events/soc.js')

let testEvent

describe('sentToSoc', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    testEvent = structuredClone(auditEvent)
  })

  test('should call audit function when soc is enabled', () => {
    mockConfig.get.mockReturnValue(true)

    sentToSoc(testEvent)

    expect(mockConfig.get).toHaveBeenCalledWith('soc.enabled')
    expect(mockAudit).toHaveBeenCalledWith(testEvent)
    expect(mockAudit).toHaveBeenCalledTimes(1)
  })

  // SOC does not need local FCP audit data
  test('should remove local audit property from event before sending to audit function', () => {
    mockConfig.get.mockReturnValue(true)

    sentToSoc(testEvent)

    expect(mockAudit).toHaveBeenCalledWith(expect.not.objectContaining({ audit: expect.anything() }))
  })

  test('should not call audit function when soc is disabled', () => {
    mockConfig.get.mockReturnValue(false)

    sentToSoc(testEvent)

    expect(mockConfig.get).toHaveBeenCalledWith('soc.enabled')
    expect(mockAudit).not.toHaveBeenCalled()
  })
})
