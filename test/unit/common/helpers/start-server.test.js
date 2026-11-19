import { describe, vi, beforeAll, afterAll, beforeEach, afterEach, test, expect } from 'vitest'
import Hapi from '@hapi/hapi'

const mockLoggerInfo = vi.fn()
const mockLoggerError = vi.fn()

const mockHapiLoggerInfo = vi.fn()
const mockHapiLoggerError = vi.fn()
const mockRunHealthChecks = vi.fn()

vi.mock('hapi-pino', () => ({
  default: {
    register: (server) => {
      server.decorate('server', 'logger', {
        info: mockHapiLoggerInfo,
        error: mockHapiLoggerError
      })
    },
    name: 'mock-hapi-pino'
  }
}))

vi.mock('../../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: (...args) => mockLoggerInfo(...args),
    error: (...args) => mockLoggerError(...args)
  })
}))

vi.mock('../../../../src/common/helpers/health/index.js', () => ({
  runHealthChecks: mockRunHealthChecks
}))

vi.mock('../../../../src/events/polling.js', () => ({
  startPolling: vi.fn(),
  stopPolling: vi.fn()
}))

vi.mock('mongodb', () => ({
  MongoClient: {
    connect: vi.fn().mockResolvedValue({
      db: vi.fn().mockReturnValue({
        listCollections: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([])
        }),
        collection: vi.fn().mockReturnValue({
          createIndex: vi.fn().mockResolvedValue(true),
          drop: vi.fn().mockResolvedValue(true),
          indexes: vi.fn().mockResolvedValue([])
        })
      }),
      close: vi.fn().mockResolvedValue(true)
    })
  }
}))

describe('startServer', () => {
  const PROCESS_ENV = process.env
  let createServerSpy
  let hapiServerSpy
  let startServerImport
  let createServerImport
  let startPolling

  beforeAll(async () => {
    process.env = { ...PROCESS_ENV }
    process.env.PORT = '3098' // Set to obscure port to avoid conflicts

    mockRunHealthChecks.mockResolvedValue(undefined)

    createServerImport = await import('../../../../src/server.js')
    startServerImport = await import(
      '../../../../src/common/helpers/start-server.js'
    )

    const pollingImport = await import('../../../../src/events/polling.js')
    startPolling = pollingImport.startPolling

    createServerSpy = vi.spyOn(createServerImport, 'createServer')
    hapiServerSpy = vi.spyOn(Hapi, 'server')
  })

  afterAll(() => {
    createServerSpy.mockRestore()
    hapiServerSpy.mockRestore()
    process.env = PROCESS_ENV
  })

  describe('When server starts', () => {
    let server

    afterAll(async () => {
      await server.stop({ timeout: 0 })
    })

    test('Should start up server as expected', async () => {
      server = await startServerImport.startServer()

      expect(mockRunHealthChecks).toHaveBeenCalledOnce()
      expect(createServerSpy).toHaveBeenCalled()
      expect(hapiServerSpy).toHaveBeenCalled()
      expect(startPolling).toHaveBeenCalled()

      expect(createServerSpy.mock.invocationCallOrder[0])
        .toBeLessThan(mockRunHealthChecks.mock.invocationCallOrder[0])

      expect(mockRunHealthChecks.mock.invocationCallOrder[0])
        .toBeLessThan(startPolling.mock.invocationCallOrder[0])

      expect(mockHapiLoggerInfo).toHaveBeenNthCalledWith(
        1,
        'Custom secure context is disabled'
      )
      expect(mockHapiLoggerInfo).toHaveBeenNthCalledWith(
        2,
        'Setting up MongoDb'
      )
      expect(mockHapiLoggerInfo).toHaveBeenNthCalledWith(
        3,
        'MongoDb connected to fcp-audit'
      )
      expect(mockHapiLoggerInfo).toHaveBeenNthCalledWith(
        4,
        'Server started successfully'
      )
      expect(mockHapiLoggerInfo).toHaveBeenNthCalledWith(
        5,
        'Access your backend on http://localhost:3098'
      )
    })
  })

  describe('When startup health checks run', () => {
    let processExitSpy

    beforeEach(() => {
      vi.clearAllMocks()
      mockRunHealthChecks.mockReset()
      mockRunHealthChecks.mockResolvedValue(undefined)

      processExitSpy = vi.spyOn(process, 'exit')
        .mockImplementation(() => {})
    })

    afterEach(() => {
      processExitSpy.mockRestore()
    })

    test('Should wait for health checks before starting polling', async () => {
      let resolveChecks

      mockRunHealthChecks.mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveChecks = resolve
        })
      )

      const starting = startServerImport.startServer()

      await vi.waitFor(() => {
        expect(mockRunHealthChecks).toHaveBeenCalledOnce()
      })

      expect(mockHapiLoggerInfo).toHaveBeenCalledWith(
        'Custom secure context is disabled'
      )

      expect(mockHapiLoggerInfo.mock.invocationCallOrder[0])
        .toBeLessThan(mockRunHealthChecks.mock.invocationCallOrder[0])

      expect(startPolling).not.toHaveBeenCalled()

      resolveChecks()

      const server = await starting

      expect(startPolling).toHaveBeenCalledOnce()
      expect(processExitSpy).not.toHaveBeenCalled()

      await server.stop({ timeout: 0 })
    })

    test.each(['mongo', 'sqs', 'sns'])(
      'Should prevent server startup when %s health check fails',
      async (name) => {
        const error = new AggregateError(
          [new Error(`${name} unavailable`)],
              `Startup health checks failed: ${name}`
        )

        mockRunHealthChecks.mockRejectedValueOnce(error)

        await expect(
          startServerImport.startServer()
        ).resolves.toBeUndefined()

        expect(mockRunHealthChecks).toHaveBeenCalledOnce()
        expect(createServerSpy).toHaveBeenCalledOnce()
        expect(hapiServerSpy).toHaveBeenCalledOnce()
        expect(startPolling).not.toHaveBeenCalled()

        expect(mockLoggerInfo).toHaveBeenCalledWith(
          'Server failed to start'
        )
        expect(mockLoggerError).toHaveBeenCalledWith(error)
        expect(processExitSpy).toHaveBeenCalledWith(1)
      }
    )
  })

  describe('When server start fails', () => {
    let processExitSpy

    beforeEach(() => {
      vi.clearAllMocks()

      mockRunHealthChecks.mockResolvedValue(undefined)
      createServerSpy.mockRejectedValueOnce(
        new Error('Server failed to start')
      )

      processExitSpy = vi.spyOn(process, 'exit')
        .mockImplementation(() => {})
    })

    afterEach(() => {
      processExitSpy.mockRestore()
    })

    test('Should log failed startup message', async () => {
      await startServerImport.startServer()

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Server failed to start'
      )
      expect(mockLoggerError).toHaveBeenCalledWith(
        new Error('Server failed to start')
      )
    })

    test('Shold exit the process with a failure code', async () => {
      await startServerImport.startServer()

      expect(processExitSpy).toHaveBeenCalledWith(1)
    })
  })
})
