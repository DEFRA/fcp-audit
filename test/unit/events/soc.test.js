import { vi, describe, beforeEach, test, expect } from 'vitest'

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

const testEvent = {
  eventType: 'uk.gov.defra.fcp.event',
}

describe('sentToSoc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should call audit function when soc is enabled', () => {
    mockConfig.get.mockReturnValue(true)

    sentToSoc(testEvent)

    expect(mockConfig.get).toHaveBeenCalledWith('soc.enabled')
    expect(mockAudit).toHaveBeenCalledWith(testEvent)
    expect(mockAudit).toHaveBeenCalledTimes(1)
  })

  test('should not call audit function when soc is disabled', () => {
    mockConfig.get.mockReturnValue(false)

    sentToSoc(testEvent)

    expect(mockConfig.get).toHaveBeenCalledWith('soc.enabled')
    expect(mockAudit).not.toHaveBeenCalled()
  })
})
