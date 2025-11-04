#!/usr/bin/env node

/**
 * Event Sender CLI
 *
 * Send different event scenarios to SQS for local development and testing
 *
 * Usage examples:
 *   node send-events.js                           # List all scenarios
 *   node send-events.js streams.successful        # Send successful stream
 *   node send-events.js single.messageRequest     # Send single message request
 */

import { SqsSender } from './sqs-sender.js'
import { getScenario, listScenarios } from '../test/scenarios/scenarios.js'

async function main () {
  const scenarioPath = process.argv[2]

  if (!scenarioPath) {
    console.log('Available Event Scenarios:')
    console.log('==============================\n')

    const availableScenarios = listScenarios()
    for (const { path, count } of availableScenarios) {
      console.log(`${path}`)
      console.log(`   Events: ${count}\n`)
    }

    console.log('Usage:')
    console.log('  node send-events.js <scenario-path>')
    console.log('Examples:')
    console.log('  node send-events.js streams.successful')
    console.log('  node send-events.js single.messageRequest')
    console.log('  node send-events.js variations.multipleCorrelations')
    return
  }

  try {
    const events = getScenario(scenarioPath)
    const sender = new SqsSender()

    console.log(`Scenario: ${scenarioPath}`)
    console.log(`Events to send: ${events.length}`)
    console.log('==============================')

    await sender.sendScenario(events, {
      name: scenarioPath,
      delayBetween: 1000 // 1 second between events
    })

    console.log('\n✅ Scenario completed successfully!')
  } catch (error) {
    if (error.message.includes('Scenario not found')) {
      console.error(error.message)
      console.log('\nAvailable scenarios:')
      for (const { path } of listScenarios()) {
        console.log(`   ${path}`)
      }
    } else {
      console.error('Error sending events:', error.message)
    }
    process.exit(1)
  }
}

try {
  await main()
} catch (error) {
  console.error('Fatal error:', error)
  process.exit(1)
}
