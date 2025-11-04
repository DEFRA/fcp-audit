import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

class SqsSender {
  constructor (options = {}) {
    const {
      queueUrl = 'http://localhost:4566/000000000000/fcp_audit',
      region = 'eu-west-2',
      endpoint = 'http://localhost:4566',
      credentials = {
        accessKeyId: 'test',
        secretAccessKey: 'test'
      }
    } = options

    this.queueUrl = queueUrl
    this.sqsClient = new SQSClient({
      region,
      ...(endpoint && {
        endpoint,
        credentials
      })
    })
  }

  async sendEvent (event) {
    const snsWrappedMessage = {
      Message: JSON.stringify(event)
    }

    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(snsWrappedMessage)
    })

    try {
      const response = await this.sqsClient.send(command)
      console.log(`✓ Event sent successfully - ID: ${response.MessageId}`)
      console.log(`  Type: ${event.type}`)
      console.log(`  Correlation ID: ${event.data?.correlationId || 'N/A'}`)
      return response
    } catch (error) {
      console.error(`✗ Failed to send event: ${error.message}`)
      throw error
    }
  }

  async sendEvents (events, options = {}) {
    const { delayBetween = 100 } = options
    const responses = []

    console.log(`Sending ${events.length} events...`)

    for (let i = 0; i < events.length; i++) {
      const event = events[i]
      console.log(`\n[${i + 1}/${events.length}] Sending event:`)

      const response = await this.sendEvent(event)
      responses.push(response)

      // Add delay between messages if specified
      if (delayBetween > 0 && i < events.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetween))
      }
    }

    console.log(`\n✓ All ${events.length} events sent successfully`)
    return responses
  }

  async sendScenario (scenario, options = {}) {
    const { name = 'Custom Scenario', delayBetween = 1000 } = options

    console.log(`\n🚀 Starting scenario: ${name}`)
    console.log(`📋 Events in scenario: ${scenario.length}`)

    return this.sendEvents(scenario, { ...options, delayBetween })
  }
}

export { SqsSender }
