import { SNSClient } from '@aws-sdk/client-sns'
import { config } from '../../config/config.js'

const { region, endpoint, accessKeyId, secretAccessKey } = config.get('aws')

const snsClient = new SNSClient({
  region,
  ...(endpoint && {
    endpoint,
    credentials: { accessKeyId, secretAccessKey }
  })
})

export { snsClient }
