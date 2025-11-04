import { vi, describe, beforeEach, test, expect } from 'vitest'

const mockLogInfo = vi.fn()

vi.mock('../../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: mockLogInfo
  })
}))

const { save: noSave } = await import('../../../../src/events/save/no-save.js')

describe('noSave', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should log no-save event', async () => {
    await noSave({ type: 'unwanted.event.type', id: 'event-id-123' })
    expect(mockLogInfo).toHaveBeenCalledWith('Skipping save of unsupported event unwanted.event.type with ID: event-id-123')
  })
})
