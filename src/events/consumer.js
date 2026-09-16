import { ReceiveMessageCommand, DeleteMessageBatchCommand, SQSClient } from '@aws-sdk/client-sqs'
import { config } from '../config/config.js'
import { processEvent } from './process.js'

const { sqs } = config.get('aws')

const sqsClient = new SQSClient()

const receiveParams = {
  QueueUrl: sqs.queueUrl,
  MaxNumberOfMessages: 10,
  WaitTimeSeconds: 10,
  MessageSystemAttributeNames: ['SentTimestamp'],
}

export async function consumeEvents () {
  const { Messages } = await sqsClient.send(new ReceiveMessageCommand(receiveParams))

  if (Array.isArray(Messages) && Messages.length > 0) {
    const processedEvents = []

    for (const event of Messages) {
      if (await processEvent(event)) {
        processedEvents.push({ Id: event.MessageId, ReceiptHandle: event.ReceiptHandle })
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
