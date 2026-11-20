import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockMongoHealthCheck = vi.fn()
const mockSqsHealthCheck = vi.fn()
const mockSnsHealthCheck = vi.fn()

vi.mock('../../../../../src/common/helpers/health/mongo.js', () => ({
  healthCheck: mockMongoHealthCheck
}))

vi.mock('../../../../../src/common/helpers/health/sqs.js', () => ({
  healthCheck: mockSqsHealthCheck
}))

vi.mock('../../../../../src/common/helpers/health/sns.js', () => ({
  healthCheck: mockSnsHealthCheck
}))

const { runHealthChecks } = await import('../../../../../src/common/helpers/health/index.js')

const checks = {
  mongo: mockMongoHealthCheck,
  sqs: mockSqsHealthCheck,
  sns: mockSnsHealthCheck
}

describe('runHealthChecks', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    for (const check of Object.values(checks)) {
      check.mockResolvedValue(undefined)
    }
  })

  test('should run all three health checks successfully', async () => {
    await expect(runHealthChecks()).resolves.toBeUndefined()

    for (const check of Object.values(checks)) {
      expect(check).toHaveBeenCalledOnce()
    }
  })

  test.each(['mongo', 'sqs', 'sns'])(
    'should reject with an AggregateError if %s fails',
    async (name) => {
      const originalError = new Error(`${name} unavailable`)
      checks[name].mockRejectedValueOnce(originalError)

      const error = await runHealthChecks().catch((err) => err)

      expect(error).toBeInstanceOf(AggregateError)
      expect(error.message).toBe(`Startup health checks failed: ${name}`)
      expect(error.errors).toEqual([originalError])
      for (const check of Object.values(checks)) {
        expect(check).toHaveBeenCalledOnce()
      }
    }
  )

  test('should aggregate multiple failures in the registered check order', async () => {
    const mongoError = new Error('mongo unavailable')
    const snsError = new Error('sns unavailable')
    mockMongoHealthCheck.mockRejectedValueOnce(mongoError)
    mockSnsHealthCheck.mockRejectedValueOnce(snsError)

    const error = await runHealthChecks().catch((err) => err)

    expect(error).toBeInstanceOf(AggregateError)
    expect(error.message).toBe('Startup health checks failed: mongo, sns')
    expect(error.errors).toEqual([mongoError, snsError])
    expect(mockSqsHealthCheck).toHaveBeenCalledOnce()
  })

  test('should wait for every check to settle before rejecting', async () => {
    mockMongoHealthCheck.mockRejectedValueOnce(new Error('mongo unavailable'))

    let resolveSqs
    mockSqsHealthCheck.mockImplementationOnce(() => new Promise((resolve) => {
      resolveSqs = resolve
    }))

    const result = runHealthChecks()
    const onSettled = vi.fn()
    result.then(onSettled, onSettled)

    // Allow any prematurely settled result to run its callbacks.
    await new Promise((resolve) => setImmediate(resolve))

    expect(onSettled).not.toHaveBeenCalled()
    expect(mockSnsHealthCheck).toHaveBeenCalledOnce()

    resolveSqs()
    await expect(result).rejects.toThrow('Startup health checks failed: mongo')
    expect(onSettled).toHaveBeenCalledOnce()
  })
})
