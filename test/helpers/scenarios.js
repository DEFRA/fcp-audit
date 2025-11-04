import { processEvent } from '../../src/events/process.js'
import { createSqsFormatEventMessage } from './sqs.js'

export async function processScenarioEvents (events) {
  for (const event of events) {
    await processEvent(createSqsFormatEventMessage(event))
  }
}
