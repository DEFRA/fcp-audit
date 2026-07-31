import { createLogger } from '../common/helpers/logging/logger.js'
import { parseEvent } from './parse.js'
import { validateEvent } from './validate.js'
import { transformEvent } from './transform.js'
import { saveEvent } from './save.js'
import { sentToSoc } from './soc.js'

const logger = createLogger()

function eventToLogContext(messageId, event) {
  return {
    event: {
      reference: messageId,
      ...(event.datetime ? { created: event.datetime } : {}),
      ...(event.environment ? { category: event.environment } : {})
    },
    ...(event.correlationid
      ? { labels: { CorrelationId: event.correlationid } }
      : {}),
    ...(event.application || event.component
      ? {
          tenant: {
            ...(event.application ? { id: event.application } : {}),
            ...(event.component ? { message: event.component } : {})
          }
        }
      : {})
  }
}

export async function processEvent(rawEvent) {
  const { MessageId } = rawEvent

  const childLogger = logger.child({ event: { reference: MessageId } })
  try {
    const event = parseEvent(rawEvent)

    childLogger.setBindings(eventToLogContext(MessageId, event))

    await validateEvent(event)
    const { auditEvent, socEvent } = transformEvent(event)

    if (auditEvent) {
      await saveEvent(auditEvent)
    }

    if (socEvent) {
      sentToSoc(socEvent)
    }

    childLogger.info({}, 'Event processed successfully')
    return true
  } catch (err) {
    childLogger.error({ err }, 'Unable to process event')
    return false
  }
}
