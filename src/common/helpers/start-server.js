import { config } from '../../config/config.js'

import { createServer } from '../../server.js'
import { createLogger } from './logging/logger.js'

async function startServer () {
  let server

  try {
    server = await createServer()
    await server.start()

    server.logger.info('Server started successfully')
    server.logger.info(
      `Access your backend on http://localhost:${config.get('port')}`
    )
  } catch (err) {
    const logger = createLogger()
    logger.info('Server failed to start')
    logger.error(err)
  }

  return server
}

export { startServer }
