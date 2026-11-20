import { publishAuditEvent } from '@defra/fcp-audit-publisher'
import { getPublisherConfig } from '../../../plugins/api-audit.js'
import { createLogger } from '../logging/logger.js'

const logger = createLogger()

const STARTUP_ENTITY_ID = 'fcp-audit startup healthcheck'

export const healthCheck = async () => {
  try {
    const publisherConfig = getPublisherConfig()

    if (!publisherConfig.sns.topicArn) {
      throw new Error('AUDIT_INTERNAL_PUBLISH_SNS_TOPIC_ARN is not set')
    }

    const event = {
      ip: '127.0.0.1',
      user: 'startup-healthcheck',
      audit: {
        entities: [{
          entity: 'audit',
          action: 'created',
          entityid: STARTUP_ENTITY_ID
        }],
        status: 'success'
      }
    }

    const { messageId } = await publishAuditEvent(event, publisherConfig)

    logger.info(`SUCCESS: Published startup audit event to SNS: messageId=${messageId}`)
  } catch (err) {
    logger.error(err, 'Error publishing startup audit event to SNS')
    throw err
  }
}
