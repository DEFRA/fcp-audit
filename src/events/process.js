import { createLogger } from '../common/helpers/logging/logger.js'
import { parseEvent } from './parse.js'
import { validateEvent } from './validate.js'
import { transformEvent } from './transform.js'
import { saveEvent } from './save.js'
import { sentToSoc } from './soc.js'

const logger = createLogger()

export async function processEvent (rawEvent) {
  const event = parseEvent(rawEvent)
  await validateEvent(event)
  const { auditEvent, socEvent } = transformEvent(event)

  if (auditEvent) {
    await saveEvent(auditEvent)
  }

  if (socEvent) {
    sentToSoc(socEvent)
  }

  logger.info(Buffer.from(JSON.stringify(event)).toString('base64'), 'Event processed successfully')
}
