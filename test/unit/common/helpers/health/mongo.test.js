import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockCreateMongoDbConnection = vi.fn()
const mockCommand = vi.fn()
const mockLogInfo = vi.fn()
const mockLogError = vi.fn()

vi.mock('../../../../../src/common/helpers/mongodb.js', () => ({
  createMongoDbConnection: mockCreateMongoDbConnection,
  getMongoDb: () => ({ db: { command: mockCommand } })
}))

vi.mock('../../../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: mockLogInfo, error: mockLogError })
}))

const { config } = await import('../../../../../src/config/config.js')
const { healthCheck } = await import('../../../../../src/common/helpers/health/mongo.js')

describe('mongo health check', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockCreateMongoDbConnection.mockResolvedValue(undefined)
    mockCommand.mockResolvedValue({ ok: 1 })
  })

  test('should connect, ping and log success', async () => {
    await expect(healthCheck()).resolves.toBeUndefined()

    expect(mockCreateMongoDbConnection).toHaveBeenCalledOnce()
    expect(mockCreateMongoDbConnection).toHaveBeenCalledWith(config.get('mongo'))
    expect(mockCommand).toHaveBeenCalledOnce()
    expect(mockCommand).toHaveBeenCalledWith({ ping: 1 })
    expect(mockLogInfo).toHaveBeenCalledWith('SUCCESS: Connected to MongoDB')
    expect(mockLogError).not.toHaveBeenCalled()
  })

  test('should log and rethrow a connection error without pinging', async () => {
    const error = new Error('connection refused')
    mockCreateMongoDbConnection.mockRejectedValueOnce(error)

    await expect(healthCheck()).rejects.toBe(error)

    expect(mockCommand).not.toHaveBeenCalled()
    expect(mockLogError).toHaveBeenCalledWith(error, 'Error connecting to MongoDB')
    expect(mockLogInfo).not.toHaveBeenCalledWith('SUCCESS: Connected to MongoDB')
  })

  test('should log and rethrow a ping error', async () => {
    const error = new Error('ping failed')
    mockCommand.mockRejectedValueOnce(error)

    await expect(healthCheck()).rejects.toBe(error)

    expect(mockCreateMongoDbConnection).toHaveBeenCalledOnce()
    expect(mockLogError).toHaveBeenCalledWith(error, 'Error connecting to MongoDB')
    expect(mockLogInfo).not.toHaveBeenCalledWith('SUCCESS: Connected to MongoDB')
  })
})
