# FCP Audit - AI Coding Agent Instructions

## Overview

Event-driven audit service for the Farming and Countryside Programme (FCP). Consumes audit events from AWS SQS, persists them to MongoDB for later analysis, and forwards security events to the Security Operations Centre (SOC).

## Architecture

### Event Flow
- Subscribes to AWS SQS queue (`fcp_audit`)
- Validates and parses incoming events
- Stores events with an `audit` object into MongoDB
- Forwards events with a `security` object to SOC
- Events can contain both, triggering both paths

### REST API
Authenticated REST API for querying stored audit events:
- `GET /api/v1/audit` — Paginated list of all events
- `GET /api/v1/audit/summary` — Aggregated totals by application/component
- `GET /api/v1/audit/search` — Filter events using conditions (field/operator/value)
- `GET /health` — Health check (no auth)
- `GET /documentation` — Swagger UI (development only)

Full schema in [`docs/openapi.yml`](../docs/openapi.yml).

### Core Technology Stack
- **Runtime:** Node.js 22+ with ES modules (`"type": "module"`)
- **Framework:** Hapi.js 21 for HTTP server
- **Queue:** AWS SQS (Floci locally)
- **Database:** MongoDB 7 with replica set
- **Authentication:** Microsoft Entra ID JWT (for REST API)
- **Testing:** Vitest with separate unit/integration directories
- **Linting:** Neostandard (modern ESLint config)
- **Config:** Convict for environment-based configuration

## Code Quality Standards

### Linting Requirements
**All code MUST pass neostandard linting before commit.**

Run linting:
```bash
npm run lint              # Check for errors
npm run lint:fix          # Auto-fix issues
```

**Common neostandard rules to follow:**
- ❌ No unused variables or imports
- ❌ No unnecessary whitespace or blank lines
- ✅ Use `const` for variables that don't change
- ✅ Consistent 2-space indentation
- ✅ Single quotes for strings (except when escaping)
- ✅ No semicolons (JavaScript ASI)
- ✅ Trailing commas in multiline objects/arrays

**When generating code:**
1. Follow existing code style in the file
2. Run linter after making changes
3. Fix all linting errors before completion
4. Never commit code with linting errors

## Standards & Guidelines

This service follows:
- **[GOV.UK Service Standard](https://www.gov.uk/service-manual/service-standard)**
- **[DEFRA Software Development Standards](https://defra.github.io/software-development-standards/)**

## Project Structure

```
src/
  index.js          # Entry point
  server.js         # Hapi server setup and plugin registration
  config/           # Convict configuration schemas
  common/helpers/   # Utilities (logging, tracing, MongoDB, pagination)
  events/           # Event processing pipeline
    consumer.js     # SQS polling and message receipt
    parse.js        # Message parsing and normalisation
    schema.js       # Joi validation schema
    save.js         # MongoDB persistence
    soc.js          # SOC forwarding
    process.js      # Orchestrates parse → validate → save/soc
    get.js          # Retrieve events from MongoDB
    search.js       # Search events with conditions
    summary.js      # Aggregate summary by application/component
  plugins/          # Hapi plugins (auth, router, swagger)
  routes/           # Route definitions
    audit.js        # /api/v1/audit, /api/v1/audit/summary, /api/v1/audit/search
    health.js       # /health
```

## Development Patterns

### Event Schema
Events are validated against the schema in `src/events/schema.js`. Required top-level fields:
- `correlationid`, `datetime`, `environment`, `version`, `application`, `component`, `ip`

Optional: `user`, `sessionid`, `audit`, `security`

At least one of `audit` or `security` must be present.

### Adding a New Route
1. Add handler in `src/routes/`
2. Use Joi to validate query/params
3. Register in `src/plugins/router.js`
4. Add corresponding unit and integration tests

### Search Conditions
The search endpoint accepts an array of conditions. Each condition has:
- `field` — must be in `ALLOWED_FIELDS` from `src/events/search.js`, or match `details.<name>`
- `operator` — one of `eq`, `ne`, `lt`, `gt`, `contains`, `notContains`
- `value` — string, max 500 chars

```javascript
// Example: find events from a specific application
conditions: [
  { field: 'application', operator: 'eq', value: 'Single Front Door' }
]
```

### Authentication
The REST API uses JWT Bearer tokens from Microsoft Entra ID. Auth is configured via:
- `AUTH_ENABLED` — enable/disable (default: true)
- `AUTH_TENANT_ID` — Entra tenant ID
- `AUTH_ALLOWED_GROUP_IDS` — comma-separated security group IDs

## Development Workflow

### Local Development
```bash
npm install
npm run docker:build
npm run docker:dev           # Runs on port 3004
```

Requires Floci (local AWS SQS/SNS emulator) and MongoDB, both provided by Docker Compose.

Use the test event script to send events to the local queue:
```bash
node scripts/send-test-event.js              # One event (audit + security)
node scripts/send-test-event.js --audit      # Audit-only event
node scripts/send-test-event.js --security   # Security-only event
node scripts/send-test-event.js --rand --events 10  # 10 random events
```

### Testing

**Always run tests via Docker — config is only set correctly through Docker Compose:**

```bash
npm run docker:test          # Run all tests with coverage (required)
npm run docker:test:watch    # TDD mode
```

> **Do not run `npm test` directly.** Environment variables and service configuration (MongoDB, SQS) are only properly set when running through Docker Compose.

### Debugging
```bash
npm run dev:debug            # Debugger listening on 0.0.0.0:9229
```

## Testing Guidelines

### Unit Tests
- Test event processing functions (parse, validate, save, search) in isolation
- Mock MongoDB and AWS SDK
- Tests in `test/unit/**/*.test.js`

### Integration Tests
- Spin up real MongoDB and Floci via Docker Compose
- Test full request/response cycles via `server.inject()`
- Tests in `test/integration/**/*.test.js`

### Test Pattern
```javascript
import { describe, test, expect, vi } from 'vitest'

describe('processEvent', () => {
  test('saves event with audit object to MongoDB', async () => {
    // Arrange
    const event = { /* valid event payload */ }
    // Act / Assert
  })
})
```

## CI/CD

### GitHub Actions
- `.github/workflows/publish.yml` — Main branch builds, runs `npm run docker:test` and SonarQube scan
- Deploys to CDP (Defra Cloud Platform)

### Key Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AWS_SQS_QUEUE_URL` | SQS queue URL | Yes |
| `MONGO_URI` | MongoDB connection URI | No (default: localhost) |
| `AUTH_TENANT_ID` | Entra tenant ID | If auth enabled |
| `AUTH_ALLOWED_GROUP_IDS` | Allowed group IDs | If auth enabled |

Full list in [`README.md`](../README.md#environment-variables).

## Security Considerations

- **JWT Validation:** Verify signatures, expiration, issuer, and group membership
- **Input Validation:** All event fields validated via Joi schema before processing
- **Search Conditions:** Field names validated against allowlist to prevent injection
- **No direct MongoDB queries from user input** — conditions are mapped through `buildConditionsQuery`
