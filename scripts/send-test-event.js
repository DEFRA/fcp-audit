import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

const options = {
  queueUrl: 'http://localhost:4567/000000000000/fcp_audit',
  region: 'eu-west-2',
  endpoint: 'http://localhost:4567',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  }
}

const sqsClient = new SQSClient({
  region: options.region,
  ...(options.endpoint && {
    endpoint: options.endpoint,
    credentials: options.credentials
  })
})

const event = {
  correlationid: '1234567890',
  datetime: new Date().toISOString(),
  environment: 'local',
  version: '1',
  application: 'fcp-audit',
  component: 'send-test-event',
  ip: '127.0.0.1',
  audit: {
    eventtype: 'test.event'
  }
}

const snsWrappedMessage = {
  Message: JSON.stringify(event)
}

const command = new SendMessageCommand({
  QueueUrl: options.queueUrl,
  MessageBody: JSON.stringify(snsWrappedMessage)
})

try {
  const response = await sqsClient.send(command)
  console.log(`✓ Event sent successfully - ID: ${response.MessageId}`)
  console.log(`  Event type: ${event.audit?.eventtype}`)
  console.log(`  Correlation ID: ${event.correlationid}`)
} catch (error) {
  console.error(`✗ Failed to send event: ${error.message}`)
  throw error
}
