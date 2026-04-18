import { randomUUID } from 'node:crypto'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

// ---------------------------------------------------------------------------
// SQS client setup
// ---------------------------------------------------------------------------

const sqsClient = new SQSClient({
  region: 'eu-west-2',
  endpoint: 'http://localhost:4567',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  }
})

const QUEUE_URL = 'http://localhost:4567/000000000000/fcp_audit'

// ---------------------------------------------------------------------------
// Static reference data
// ---------------------------------------------------------------------------

const APP_COMPONENTS = [
  {
    application: 'Single Front Door',
    components: [
      'fcp-sfd-frontend',
      'fcp-sfd-frontend-internal',
      'fcp-sfd-object-processor',
      'fcp-sfd-comms',
      'fcp-sfd-crm'
    ]
  },
  {
    application: 'Data Access Layer',
    components: ['fcp-dal-api']
  },
  {
    application: 'Grants Platform',
    components: ['grants-ui', 'land-grants', 'gas-enablement']
  }
]

const ENTITY_ACTIONS = {
  application: ['created', 'read', 'updated', 'deleted', 'submitted', 'accepted', 'rejected', 'withdrawn'],
  agreement: ['created', 'read', 'updated', 'deleted', 'submitted', 'accepted', 'rejected', 'withdrawn'],
  payment: ['created', 'read', 'updated', 'deleted', 'enriched', 'processed', 'submitted', 'acknowledged', 'settled', 'held', 'unheld', 'cancelled'],
  settlement: ['created', 'read', 'updated', 'deleted'],
  document: ['created', 'read', 'updated', 'deleted', 'downloaded'],
  person: ['created', 'read', 'updated', 'deleted', 'locked'],
  business: ['created', 'read', 'updated', 'deleted', 'locked'],
  permission: ['created', 'read', 'updated', 'deleted'],
  parcel: ['created', 'read', 'updated', 'deleted', 'split', 'merged'],
  message: ['created', 'read', 'updated', 'deleted', 'sent', 'delivered', 'rejected', 'failed'],
  cph: ['created', 'read', 'updated', 'deleted'],
  address: ['created', 'read', 'updated', 'deleted'],
  telephone: ['created', 'read', 'updated', 'deleted'],
  bank: ['created', 'read', 'updated', 'deleted'],
  'authenticate-question': ['created', 'read', 'updated', 'deleted'],
  'land-cover': ['created', 'read', 'updated', 'deleted'],
  'land-use': ['created', 'read', 'updated', 'deleted']
}

const ENTITY_KEYS = Object.keys(ENTITY_ACTIONS)

const ENVIRONMENTS = ['local', 'cdp-dev', 'cdp-test', 'fcp-dev', 'fcp-test']

const STATUSES = ['success', 'failure']

const ACCOUNT_KEYS = ['sbi', 'frn', 'vendor', 'trader', 'organisationId', 'crn', 'personId']

const SOC_MESSAGES = [
  'User authentication attempt',
  'Privileged access granted',
  'Configuration change detected',
  'Unusual login location',
  'Multiple failed attempts'
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)]

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const randomIp = () =>
  `${randomInt(1, 254)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`

const randomSbi = () => String(randomInt(100000000, 999999999))

const randomPmcode = () => String(randomInt(1000, 9999))

const buildAuditDetails = () => {
  if (Math.random() > 0.5) {
    return undefined
  }
  const key = randomItem(['custom1', 'custom2'])
  return { [key]: key }
}

// ---------------------------------------------------------------------------
// Builder functions
// ---------------------------------------------------------------------------

const buildAuditObject = (rand) => {
  if (!rand) {
    return {
      entities: [
        { entity: 'application', action: 'created', entityid: 'APP-1234567890' }
      ],
      accounts: { sbi: '123456789' },
      status: 'success'
    }
  }

  const entityCount = randomInt(1, 3)
  const entities = Array.from({ length: entityCount }, () => {
    const entity = randomItem(ENTITY_KEYS)
    const action = randomItem(ENTITY_ACTIONS[entity])
    const entityid = Math.random() > 0.4 ? randomUUID().slice(0, 20) : undefined
    return entityid ? { entity, action, entityid } : { entity, action }
  })

  const accountCount = randomInt(1, 3)
  const pickedKeys = [...ACCOUNT_KEYS].sort(() => Math.random() - 0.5).slice(0, accountCount)
  const accounts = Object.fromEntries(pickedKeys.map((k) => [k, randomSbi()]))

  const details = buildAuditDetails()

  return {
    entities,
    accounts,
    status: randomItem(STATUSES),
    ...(details !== undefined && { details })
  }
}

const buildSecurityObject = (rand) => {
  if (!rand) {
    return {
      pmcode: '0201',
      priority: 0,
      details: {
        message: 'Test security event'
      }
    }
  }

  return {
    pmcode: randomPmcode(),
    priority: randomInt(0, 9),
    details: {
      message: randomItem(SOC_MESSAGES)
    }
  }
}

const buildEvent = (mode, rand) => {
  const appEntry = randomItem(APP_COMPONENTS)
  const application = rand ? appEntry.application : 'Single Front Door'
  const component = rand ? randomItem(appEntry.components) : 'fcp-sfd-frontend'
  const environment = rand ? randomItem(ENVIRONMENTS) : 'local'
  const correlationid = rand ? randomUUID().slice(0, 20) : '1234567890'
  const ip = rand ? randomIp() : '127.0.0.1'
  const user = rand ? `IDM/${randomUUID()}` : 'IDM/8b7c6b0a-4ea2-e911-a971-000d3a28d1a0'
  const sessionid = rand ? randomUUID() : 'e66d78f5-a58d-46f6-a9b4-f8c90e99b6dc'

  // When --rand, pick a random payload combination
  const resolvedMode = rand ? randomItem(['audit', 'security', 'both']) : mode

  return {
    user,
    sessionid,
    correlationid,
    datetime: new Date().toISOString(),
    environment,
    version: '1',
    application,
    component,
    ip,
    audit: (resolvedMode === 'audit' || resolvedMode === 'both')
      ? buildAuditObject(rand)
      : null,
    security: (resolvedMode === 'security' || resolvedMode === 'both')
      ? buildSecurityObject(rand)
      : null
  }
}

// ---------------------------------------------------------------------------
// Send
// ---------------------------------------------------------------------------

const sendEvent = async (event) => {
  const command = new SendMessageCommand({
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify({ Message: JSON.stringify(event) })
  })
  const response = await sqsClient.send(command)
  return response.MessageId
}

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)

const isRand = args.includes('--rand')
const isAuditOnly = !isRand && args.includes('--audit')
const isSecurityOnly = !isRand && args.includes('--security')

let mode

if (isAuditOnly) {
  mode = 'audit'
} else if (isSecurityOnly) {
  mode = 'security'
} else {
  mode = 'both'
}

const eventsIdx = args.indexOf('--events')
const eventCount = eventsIdx !== -1 && args[eventsIdx + 1]
  ? Number.parseInt(args[eventsIdx + 1], 10)
  : 1

if (Number.isNaN(eventCount) || eventCount < 1) {
  console.error('✗ --events requires a positive integer')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log(`Sending ${eventCount} event(s) [mode: ${isRand ? 'rand' : mode}]\n`)

for (let i = 0; i < eventCount; i++) {
  const event = buildEvent(mode, isRand)
  try {
    const messageId = await sendEvent(event)
    const label = `[${i + 1}/${eventCount}]`
    console.log(`✓ ${label} Sent - ID: ${messageId}`)
    console.log(`    application: ${event.application} / ${event.component}`)
    console.log(`    correlationid: ${event.correlationid}`)
    if (event.audit) {
      const entities = event.audit.entities.map((e) => `${e.entity}:${e.action}`).join(', ')
      console.log(`    audit entities: ${entities}`)
    }
    if (event.security) {
      console.log(`    security pmcode: ${event.security.pmcode} priority: ${event.security.priority}`)
    }
  } catch (error) {
    console.error(`✗ [${i + 1}/${eventCount}] Failed: ${error.message}`)
    throw error
  }
}
