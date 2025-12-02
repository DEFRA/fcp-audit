import { describe, beforeEach, beforeAll, afterAll, test, expect, vi } from 'vitest'
import { createMongoDbConnection, closeMongoDbConnection, getMongoDb } from '../../src/common/helpers/mongodb.js'
import { config } from '../../src/config/config.js'
import { clearAllCollections } from '../helpers/mongo.js'
import { createSqsFormatEventMessage } from '../helpers/sqs.js'
import { event as mockEvent } from '../mocks/event.js'

const mockAudit = vi.fn()

vi.mock('@defra/cdp-auditing', () => ({
  audit: mockAudit
}))

const { processEvent } = await import('../../src/events/process.js')

let collections
let event

describe('audit event scenarios', () => {
  beforeAll(async () => {
    await createMongoDbConnection(config.get('mongo'))

    const mongoDb = getMongoDb()
    collections = mongoDb.collections
  })

  beforeEach(async () => {
    vi.clearAllMocks()

    await clearAllCollections(collections)

    const events = await collections.audit.find({}).toArray()
    expect(events).toHaveLength(0)

    event = structuredClone(mockEvent)
  })

  afterAll(async () => {
    await closeMongoDbConnection()
  })

  test('should process an audit event with audit data only saving to database', async () => {
    delete event.security

    await processEvent(createSqsFormatEventMessage(event))

    const savedMessages = await collections.audit.find({}).toArray()
    expect(savedMessages).toHaveLength(1)
    expect(savedMessages[0].audit.eventtype).toBe(event.audit.eventtype)
  })

  test('should process an audit event with SOC data only not saving to database', async () => {
    delete event.audit

    await processEvent(createSqsFormatEventMessage(event))

    const savedMessages = await collections.audit.find({}).toArray()
    expect(savedMessages).toHaveLength(0)
    expect(mockAudit).toHaveBeenCalledTimes(1)
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ pmcode: event.security.pmcode }))
  })
})
