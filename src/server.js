import Hapi from '@hapi/hapi'
import Joi from 'joi'
import Jwt from '@hapi/jwt'

import { config } from './config/config.js'
import { router } from './plugins/router.js'
import { swagger } from './plugins/swagger.js'
import { requestLogger } from './common/helpers/logging/request-logger.js'
import { failAction } from './common/helpers/fail-action.js'
import { secureContext } from './common/helpers/secure-context/index.js'
import { pulse } from './common/helpers/pulse.js'
import { requestTracing } from './common/helpers/request-tracing.js'
import { setupProxy } from './common/helpers/proxy/setup-proxy.js'
import { mongoDb } from './common/helpers/mongodb.js'
import { auth } from './plugins/auth.js'
import { mongoTimeout } from './plugins/mongo-timeout.js'
import { polling } from './common/helpers/polling.js'
import { apiv } from './plugins/apiv.js'

async function createServer () {
  setupProxy()
  const server = Hapi.server({
    host: config.get('host'),
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        },
        failAction
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    }
  })

  server.validator(Joi)

  await server.register([
    Jwt,
    auth,
    requestLogger,
    requestTracing,
    secureContext,
    pulse,
    mongoDb,
    ...swagger,
    apiv,
    mongoTimeout,
    polling
  ])

  await server.register(router)

  return server
}

export { createServer }
