![Build](https://github.com/defra/fcp-audit/actions/workflows/publish.yml/badge.svg)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-audit&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-audit)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-audit&metric=bugs)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-audit)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-audit&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-audit)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-audit&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-audit)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-audit&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-audit)

# FCP Audit service

The FCP Audit service is a common component to support auditing across the Farming and Countryside Programme (FCP) ecosystem.

FCP Audit subscribes to events across the FCP ecosystem via an AWS SQS queue. These events are persisted for later analysis and also sent to the Security Event and Incident Management (SEIM) system for security monitoring.

## Requirements

### Docker

This application is intended to be run in a Docker container to ensure consistency across environments.

Docker can be installed from [Docker's official website](https://docs.docker.com/get-docker/).

> The test suite includes integration tests which are dependent on a Postgres container so cannot be run without Docker.

## Local development

### Setup

Install application dependencies:

```bash
npm install
```

### Development

To run the application in `development` mode run:

```bash
npm run docker:dev
```

### Testing

To test the application run:

```bash
npm run docker:test
```

Tests can also be run in watch mode to support Test Driven Development (TDD):

```bash
npm run docker:test:watch
```

## Environment Variables

The FDM service can be configured using the following environment variables:

> Note: Default valid values are already applied for local development and testing through Docker Compose.

### Core Service

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Runtime environment (`development`, `test`, `production`) | - | No |
| `HOST` | IP address to bind the service | `0.0.0.0` | No |
| `PORT` | Port number to bind the service | `3004` | No |
| `SERVICE_VERSION` | Service version (injected in CDP environments) | `null` | No |
| `ENVIRONMENT` | CDP environment name | `local` | No |

### AWS

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AWS_REGION` | AWS region for services | `eu-west-2` | No |
| `AWS_ENDPOINT_URL` | AWS endpoint URL (for LocalStack) | `null` | No |
| `AWS_ACCESS_KEY_ID` | AWS access key ID | `null` | No |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key | `null` | No |
| `AWS_SQS_QUEUE_URL` | SQS queue URL for event consumption | `null` | Yes |

### MongoDB

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MONGO_URI` | MongoDB connection URI | `mongodb://127.0.0.1:27017/` | No |
| `MONGO_DATABASE` | MongoDB database name | `fcp-audit` | No |
| `MONGO_RETRY_WRITES` | Enable MongoDB write retries | `null` | No |
| `MONGO_READ_PREFERENCE` | MongoDB read preference | `null` | No |

### Logging

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `LOG_ENABLED` | Enable/disable logging | `true` (false in test) | No |
| `LOG_LEVEL` | Logging level | `info` | No |
| `LOG_FORMAT` | Log output format (`ecs`, `pino-pretty`) | `ecs` (prod), `pino-pretty` (dev) | No |

### Security and Performance

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `HTTP_PROXY` | HTTP proxy URL | `null` | No |
| `ENABLE_SECURE_CONTEXT` | Enable secure context | `true` (prod), `false` (dev) | No |
| `ENABLE_METRICS` | Enable metrics reporting | `true` (prod), `false` (dev) | No |
| `TRACING_HEADER` | CDP tracing header name | `x-cdp-request-id` | No |
| `DATA_GLOBAL_TTL` | Global TTL for data in seconds | `null` | No |

### Authentication

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AUTH_ENABLED` | Enable authentication | `true` | No |
| `AUTH_TENANT_ID` | Microsoft Entra ID tenant ID | `null` | If Auth Enabled |
| `AUTH_ALLOWED_GROUP_IDS` | Comma-separated allowed security group IDs | `null` | If Auth Enabled |

## Using Audit in Your Docker Compose

To integrate the fcp-audit service into your own project's Docker Compose setup, you need to include the service along with its required dependencies: MongoDB and LocalStack.

### Dependencies

The fcp-audit service requires:

1. **MongoDB with replica set** - Required for MongoDB sessions to work properly
2. **LocalStack** - Provides SQS and SNS services for local development
3. **LocalStack initialization script** - Sets up the required SQS queues and SNS topics

### Minimum Setup

Add this to your `docker-compose.yml`:

```yaml
services:
  # Your existing services...
  
  fcp-audit:
    image: defradigital/fcp-audit:latest  # Or specific version tag
    depends_on:
      mongodb:
        condition: service_healthy
      localstack:
        condition: service_healthy
    environment:
      MONGO_URI: mongodb://mongodb:27017
      AWS_REGION: eu-west-2
      AWS_ACCESS_KEY_ID: test
      AWS_SECRET_ACCESS_KEY: test
      AWS_SQS_QUEUE_URL: http://localstack:4566/000000000000/fcp_audit
      AWS_ENDPOINT_URL: http://localstack:4566
    ports:
      - '3004:3004'
    networks:
      - fcp-network

  mongodb:
    image: mongo:6.0.13
    command: --replSet rs0 --bind_ip_all --port 27017
    healthcheck:
      test: test $$(mongosh --port 27017 --quiet --eval "try {rs.initiate({_id:'rs0',members:[{_id:0,host:\"mongodb:27017\"}]})} catch(e) {rs.status().ok}") -eq 1
      interval: 10s
      start_period: 10s
    ports:
      - '27017:27017'
    volumes:
      - mongodb-data:/data
    networks:
      - fcp-network

  localstack:
    image: localstack/localstack
    environment:
      LS_LOG: warn
      SERVICES: sqs,sns
      AWS_ACCESS_KEY_ID: test
      AWS_SECRET_ACCESS_KEY: test
    healthcheck:
      test: ['CMD', 'curl', 'localhost:4566']
      interval: 5s
      start_period: 5s
      retries: 3
    ports:
      - '4566:4566'
    volumes:
      - ./path/to/fcp-audit/localstack/localstack.sh:/etc/localstack/init/ready.d/localstack.sh
      - localstack-data:/var/lib/localstack
    networks:
      - fcp-network

networks:
  fcp-network:
    driver: bridge

volumes:
  mongodb-data:
  localstack-data:
```

### LocalStack Initialization Script

Copy or reference the LocalStack setup script from the fcp-audit repository at [`localstack/localstack.sh`](localstack/localstack.sh). This script creates the required SQS queues, dead letter queues, SNS topics, and subscriptions needed for the service to function properly.

### Accessing the Service

Once running, the fcp-audit service will be available at:
- **API**: `http://localhost:3004`
- **Health Check**: `http://localhost:3004/health`

The service will automatically start consuming events from the SQS queue and storing them in MongoDB.

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
