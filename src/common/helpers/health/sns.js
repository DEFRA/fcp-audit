import { GetTopicAttributesCommand } from '@aws-sdk/client-sns'
import { config } from '../../../config/config.js'
import { snsClient } from '../sns.js'
import { createLogger } from '../logging/logger.js'

const logger = createLogger()

export const healthCheck = async () => {
  const topicArn = config.get('aws.sns.topicArn')

  try {
    if (!topicArn) {
      throw new Error('AUDIT_INTERNAL_PUBLISH_SNS_TOPIC_ARN is not set')
    }

    logger.info(`Checking SNS topic ${topicArn}`)

    const { Attributes } = await snsClient.send(
      new GetTopicAttributesCommand({ TopicArn: topicArn })
    )

    if (Attributes?.TopicArn !== topicArn) {
      throw new Error('SNS returned an unexpected topic ARN')
    }

    logger.info('SUCCESS: Connected to SNS topic')
  } catch (err) {
    logger.error(err, 'Error connecting to SNS topic')
    throw err
  }
}
