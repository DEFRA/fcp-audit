import { parseEvent } from './parse.js'
import { validateEvent } from './validate.js'
import { saveEvent } from './save/audit.js'

export async function processEvent (rawEvent) {
  const event = parseEvent(rawEvent)
  await validateEvent(event)
  await saveEvent(event)
}
