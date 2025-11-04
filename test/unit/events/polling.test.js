import { vi, describe, beforeEach, test, expect } from 'vitest'

vi.useFakeTimers()

const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(() => 123)
const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

const mockConsumeEvents = vi.fn()

vi.mock('../../../src/events/consumer.js', () => ({
  consumeEvents: mockConsumeEvents
}))

const mockLogError = vi.fn()
const mockLogInfo = vi.fn()

vi.mock('../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    error: mockLogError,
    info: mockLogInfo
  })
}))

describe('Polling', () => {
  let pollingModule

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    pollingModule = await import('../../../src/events/polling.js')
  })

  describe('startPolling', () => {
    test('should start polling and trigger first poll', () => {
      pollingModule.startPolling()
      expect(mockLogInfo).toHaveBeenCalledWith('Starting event polling')
    })

    test('should not start polling if already started', () => {
      pollingModule.startPolling()
      vi.clearAllMocks()
      pollingModule.startPolling()
      expect(mockLogInfo).not.toHaveBeenCalledWith('Starting event polling')
    })
  })

  describe('stopPolling', () => {
    test('should stop polling and log message', () => {
      pollingModule.startPolling()
      vi.clearAllMocks()

      pollingModule.stopPolling()

      expect(mockLogInfo).toHaveBeenCalledWith('Event polling stopped')
    })

    test('should clear timeout when stopping after polling has created one', async () => {
      mockConsumeEvents.mockResolvedValueOnce(true)
      pollingModule.startPolling()

      // Manually trigger pollForEvents to create a timeout
      await pollingModule.pollForEvents()

      vi.clearAllMocks()
      pollingModule.stopPolling()

      expect(clearTimeoutSpy).toHaveBeenCalledWith(123)
      expect(mockLogInfo).toHaveBeenCalledWith('Event polling stopped')
    })

    test('should not log if polling already stopped', () => {
      pollingModule.stopPolling() // Already stopped
      expect(mockLogInfo).not.toHaveBeenCalledWith('Event polling stopped')
    })

    test('should not call clearTimeout if no timeout exists', () => {
      pollingModule.stopPolling() // Stop when no timeout is active
      expect(clearTimeoutSpy).not.toHaveBeenCalled()
    })
  })

  describe('pollForEvents', () => {
    test('should not run if polling is not enabled', async () => {
      // Polling not started
      await pollingModule.pollForEvents()
      expect(mockConsumeEvents).not.toHaveBeenCalled()
      expect(setTimeoutSpy).not.toHaveBeenCalled()
    })

    test('should trigger event consumption and schedule next poll when enabled and returns true', async () => {
      mockConsumeEvents.mockResolvedValueOnce(true)
      pollingModule.startPolling()

      await pollingModule.pollForEvents()

      expect(mockConsumeEvents).toHaveBeenCalled()
      // Should be MIN_BACK_OFF (5ms) with jitter (±10%), so 4-6ms range
      expect(setTimeoutSpy).toHaveBeenCalledWith(pollingModule.pollForEvents, expect.any(Number))
      const timeoutValue = setTimeoutSpy.mock.calls[0][1]
      expect(timeoutValue).toBeGreaterThanOrEqual(4)
      expect(timeoutValue).toBeLessThanOrEqual(6)
    })

    test('should schedule next poll with backoff when enabled and returns false', async () => {
      mockConsumeEvents.mockResolvedValueOnce(false)
      pollingModule.startPolling()

      await pollingModule.pollForEvents()

      expect(mockConsumeEvents).toHaveBeenCalled()
      expect(setTimeoutSpy).toHaveBeenCalledWith(pollingModule.pollForEvents, expect.any(Number))
      // Should be doubled from DEFAULT_BACK_OFF (1000ms -> 2000ms) with jitter, so ~1800-2200ms range
      const timeoutValue = setTimeoutSpy.mock.calls[0][1]
      expect(timeoutValue).toBeGreaterThanOrEqual(1800)
      expect(timeoutValue).toBeLessThanOrEqual(2200)
    })

    test('should log error and schedule retry when enabled and consumption throws error', async () => {
      const testError = new Error('Test consumption error')
      mockConsumeEvents.mockRejectedValueOnce(testError)
      pollingModule.startPolling()

      await pollingModule.pollForEvents()

      expect(mockLogError).toHaveBeenCalledWith(testError)
      expect(setTimeoutSpy).toHaveBeenCalledWith(pollingModule.pollForEvents, expect.any(Number))
    })

    test('should not schedule next poll if polling is stopped during execution', async () => {
      mockConsumeEvents.mockImplementation(async () => {
        pollingModule.stopPolling() // Stop polling while consumeEvents is running
        return true
      })
      pollingModule.startPolling()

      await pollingModule.pollForEvents()

      expect(mockConsumeEvents).toHaveBeenCalled()
      expect(setTimeoutSpy).not.toHaveBeenCalled()
    })

    test('should prevent concurrent polling with inFlight guard', async () => {
      let resolveFirst
      const firstCall = new Promise(resolve => { resolveFirst = resolve })
      mockConsumeEvents.mockReturnValueOnce(firstCall)

      pollingModule.startPolling()

      // Start first poll
      const firstPoll = pollingModule.pollForEvents()

      // Try to start second poll while first is in flight
      await pollingModule.pollForEvents()

      expect(mockConsumeEvents).toHaveBeenCalledTimes(1) // Only first call should execute

      // Resolve first call
      resolveFirst(true)
      await firstPoll

      expect(setTimeoutSpy).toHaveBeenCalledTimes(1) // Only one setTimeout scheduled
    })

    test('should clear existing timeout before setting new one when timeout exists', async () => {
      mockConsumeEvents.mockResolvedValueOnce(true).mockResolvedValueOnce(true)
      pollingModule.startPolling()

      // First poll creates a timeout
      await pollingModule.pollForEvents()
      vi.clearAllMocks() // Clear the calls from first poll

      // Second poll should clear the existing timeout before setting new one
      await pollingModule.pollForEvents()

      expect(clearTimeoutSpy).toHaveBeenCalledWith(123) // Mock timeout ID
      // Should be MIN_BACK_OFF (5ms) with jitter (±10%), so 4-6ms range
      expect(setTimeoutSpy).toHaveBeenCalledWith(pollingModule.pollForEvents, expect.any(Number))
      const timeoutValue = setTimeoutSpy.mock.calls[0][1]
      expect(timeoutValue).toBeGreaterThanOrEqual(4)
      expect(timeoutValue).toBeLessThanOrEqual(6)
    })

    test('should not clear timeout on first poll when none exists', async () => {
      mockConsumeEvents.mockResolvedValueOnce(true)
      pollingModule.startPolling()
      vi.clearAllMocks() // Clear the startPolling call

      await pollingModule.pollForEvents()

      // On first poll, no existing timeout to clear
      expect(clearTimeoutSpy).not.toHaveBeenCalled()
      // Should be MIN_BACK_OFF (5ms) with jitter (±10%), so 4-6ms range
      expect(setTimeoutSpy).toHaveBeenCalledWith(pollingModule.pollForEvents, expect.any(Number))
      const timeoutValue = setTimeoutSpy.mock.calls[0][1]
      expect(timeoutValue).toBeGreaterThanOrEqual(4)
      expect(timeoutValue).toBeLessThanOrEqual(6)
    })
  })
})
