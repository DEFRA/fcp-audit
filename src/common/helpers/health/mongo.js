import { config } from '../../../config/config.js'
import { createMongoDbConnection, getMongoDb } from '../mongodb.js'
import { createLogger } from '../logging/logger.js'

const logger = createLogger()

export const healthCheck = async () => {
  const options = config.get('mongo')

  try {
    logger.info(`Connecting to MongoDB database ${options.databaseName}`)

    await createMongoDbConnection(options)
    await getMongoDb().db.command({ ping: 1 })

    logger.info('SUCCESS: Connected to MongoDB')
  } catch (error) {
    logger.error(error, 'Error connecting to MongoDB')
    throw error
  }
}
