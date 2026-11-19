import { healthCheck as mongo } from './mongo.js'
import { healthCheck as sqs } from './sqs.js'
import { healthCheck as sns } from './sns.js'

const healthChecks = { mongo, sqs, sns }

export const runHealthChecks = async () => {
  const entries = Object.entries(healthChecks)

  const results = await Promise.allSettled(
    entries.map(([, check]) => check())
  )

  const failures = results.flatMap((result, index) =>
    result.status === 'rejected'
      ? [{ name: entries[index][0], error: result.reason }]
      : []
  )

  if (failures.length > 0) {
    throw new AggregateError(
      failures.map(({ error }) => error),
        `Startup health checks failed: ${
            failures.map(({ name }) => name).join(', ')
        }`
    )
  }
}
