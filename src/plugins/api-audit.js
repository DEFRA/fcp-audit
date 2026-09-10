import { publishAuditEvent } from '@defra/fcp-audit-publisher'
import { getTraceId } from '@defra/hapi-tracing'
import { config } from '../config/config.js'
import { snsClient } from '../common/helpers/sns.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const AUDIT_EVENT_SCHEMA_VERSION = '1.0.0'
const APPLICATION = 'Audit Service'
const COMPONENT = config.get('serviceName')
const ENVIRONMENT_NAME = `cdp-${config.get('cdpEnvironment')}`
const TOPIC_ARN = config.get('aws.sns.topicArn')

const logger = createLogger()

export const apiAudit = {
  plugin: {
    name: 'api-audit',
    register: (server, _options) => {
      server.ext('onPreResponse', (request, h) => {
        if (shouldAudit(request)) {
          const status = getAuditStatus(request)

          publishApiAuditEvent(request, status).catch((err) =>
            logger.error({ err }, 'Failed to publish API audit event')
          )
        }

        return h.continue
      })
    }
  }
}

function shouldAudit (request) {
  return Boolean(request.route.settings.plugins.apiAudit)
}

function getAuditStatus (request) {
  const response = request.response
  return response.isBoom || response.statusCode >= 400 ? 'failure' : 'success'
}

function getErrorDetails (response) {
  if (response.isBoom) {
    const { statusCode, error, message } = response.output.payload
    return { statusCode, error, message }
  }

  return { statusCode: response.statusCode }
}

async function publishApiAuditEvent (request, status) {
  const { action } = request.route.settings.plugins.apiAudit

  await publishAuditEvent(
    {
      version: AUDIT_EVENT_SCHEMA_VERSION,
      user: request.auth.credentials?.principalId,
      ip: request.info.remoteAddress,
      ...(getTraceId() && { correlationid: getTraceId() }),
      audit: {
        entities: [{ entity: 'audit', action }],
        status,
        details: {
          path: request.path,
          method: request.method,
          query: request.query,
          ...(status === 'failure' && {
            errorDetails: getErrorDetails(request.response)
          })
        }
      }
    },
    {
      snsClient,
      sns: { topicArn: TOPIC_ARN },
      environment: ENVIRONMENT_NAME,
      application: APPLICATION,
      component: COMPONENT,
      generateCorrelationId: true
    }
  )
}
