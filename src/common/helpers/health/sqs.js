import { GetQueueAttributesCommand } from '@aws-sdk/client-sqs'
import { config } from '../../../config/config.js'
import { sqsClient } from '../sqs.js'
import { createLogger } from '../logging/logger.js'

const logger = createLogger()

export const healthCheck = async () => {
  const queueUrl = config.get('aws.sqs.queueUrl')

  try {
    if (!queueUrl) {
      throw new Error('AWS_SQS_QUEUE_URL is not set')
    }

    logger.info(`Connecting to SQS queue ${queueUrl}`)

    // Reads metadata only, so no messages are received or hidden from the poller
    await sqsClient.send(new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: ['QueueArn']
    }))

    logger.info('SUCCESS: Connected to SQS queue')
  } catch (err) {
    logger.error(err, 'Error connecting to SQS queue')
    throw err
  }
}
