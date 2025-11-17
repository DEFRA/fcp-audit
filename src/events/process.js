import { parseEvent } from './parse.js'
import { validateEvent } from './validate.js'
import { saveEvent } from './audit.js'
import { sentToSoc } from './soc.js'

export async function processEvent (rawEvent) {
  const event = parseEvent(rawEvent)
  await validateEvent(event)
  await saveEvent(event)
  sentToSoc(event)
}
