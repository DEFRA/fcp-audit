import { publishAuditEvent } from '@defra/fcp-audit-publisher'
import { getTraceId } from '@defra/hapi-tracing'
import { config } from '../config/config.js'
import { snsClient } from '../common/helpers/sns.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { getEndUserIpAddress } from '../common/helpers/get-client-ip.js'

const AUDIT_EVENT_SCHEMA_VERSION = '1.0.0'
const HTTP_STATUS_BAD_REQUEST = 400
const DEFAULT_ENTITY = 'audit'
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
  return response.isBoom || response.statusCode >= HTTP_STATUS_BAD_REQUEST
    ? 'failure'
    : 'success'
}

function getErrorDetails (response) {
  if (response.isBoom) {
    const { statusCode, error, message } = response.output.payload
    return { statusCode, error, message }
  }

  return { statusCode: response.statusCode }
}

function getAuditUser (credentials) {
  return credentials?.preferredUsername ??
    credentials?.upn ??
    credentials?.name ??
    credentials?.oid
}

async function publishApiAuditEvent (request, status) {
  const { action, entity = DEFAULT_ENTITY } = request.route.settings.plugins.apiAudit

  await publishAuditEvent(
    {
      version: AUDIT_EVENT_SCHEMA_VERSION,
      user: getAuditUser(request.auth.credentials),
      ip: getEndUserIpAddress(request),
      ...(getTraceId() && { correlationid: getTraceId() }),
      audit: {
        entities: [{ entity, action }],
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
