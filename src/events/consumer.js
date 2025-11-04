import { ReceiveMessageCommand, DeleteMessageBatchCommand, SQSClient } from '@aws-sdk/client-sqs'
import { config } from '../config/config.js'
import { processEvent } from './process.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const { sqs, region, endpoint, accessKeyId, secretAccessKey } = config.get('aws')

const logger = createLogger()

const sqsClient = new SQSClient({
  region,
  ...(endpoint && {
    endpoint,
    credentials: { accessKeyId, secretAccessKey }
  })
})

const receiveParams = {
  QueueUrl: sqs.queueUrl,
  MaxNumberOfMessages: 10,
  WaitTimeSeconds: 10,
}

export async function consumeEvents () {
  const { Messages } = await sqsClient.send(new ReceiveMessageCommand(receiveParams))

  if (Array.isArray(Messages) && Messages.length > 0) {
    const processedEvents = []

    for (const event of Messages) {
      try {
        console.log('Processing event:', event)
        await processEvent(event)
        processedEvents.push({ Id: event.MessageId, ReceiptHandle: event.ReceiptHandle })
      } catch (err) {
        logger.error(err, 'Unable to process event')
      }
    }

    if (processedEvents.length > 0) {
      await sqsClient.send(new DeleteMessageBatchCommand({
        QueueUrl: sqs.queueUrl,
        Entries: processedEvents
      }))
    }
    return true
  }
  return false
}
