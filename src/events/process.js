import { parseEvent } from './parse.js'
import { validateEvent } from './validate.js'
import { transformEvent } from './transform.js'
import { saveEvent } from './save.js'
import { sentToSoc } from './soc.js'

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
}
