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
  user: 'IDM/8b7c6b0a-4ea2-e911-a971-000d3a28d1a0',
  sessionid: 'e66d78f5-a58d-46f6-a9b4-f8c90e99b6dc',
  correlationid: '1234567890',
  datetime: new Date().toISOString(),
  environment: 'local',
  version: '1',
  application: 'fcp-audit',
  component: 'send-test-event',
  ip: '127.0.0.1',
  audit: {
    entities: [
      { entity: 'application', action: 'created', entityid: 'APP-1234567890' }
    ],
    accounts: {
      sbi: '123456789'
    },
    status: 'success'
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
  console.log(`  Entity: ${event.audit?.entities?.[0]?.entity}`)
  console.log(`  Action: ${event.audit?.entities?.[0]?.action}`)
  console.log(`  Correlation ID: ${event.correlationid}`)
} catch (error) {
  console.error(`✗ Failed to send event: ${error.message}`)
  throw error
}
