import convict from 'convict'
import convictFormatWithValidator from 'convict-format-with-validator'
import { convictValidateMongoUri } from '../common/helpers/convict/validate-mongo-uri.js'
import { securityGroupArray } from './formats.js'

convict.addFormat(convictValidateMongoUri)
convict.addFormats(convictFormatWithValidator)
convict.addFormat(securityGroupArray)

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'

const config = convict({
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  host: {
    doc: 'The IP address to bind',
    format: 'ipaddress',
    default: '0.0.0.0',
    env: 'HOST'
  },
  port: {
    doc: 'The port to bind',
    format: 'port',
    default: 3004,
    env: 'PORT'
  },
  serviceName: {
    doc: 'Api Service Name',
    format: String,
    default: 'fcp-audit'
  },
  cdpEnvironment: {
    doc: 'The CDP environment the app is running in. With the addition of "local" for local development',
    format: [
      'local',
      'infra-dev',
      'management',
      'dev',
      'test',
      'perf-test',
      'ext-test',
      'prod'
    ],
    default: 'local',
    env: 'ENVIRONMENT'
  },
  log: {
    isEnabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: !isTest,
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      env: 'LOG_LEVEL'
    },
    format: {
      doc: 'Format to output logs in',
      format: ['ecs', 'pino-pretty'],
      default: isProduction ? 'ecs' : 'pino-pretty',
      env: 'LOG_FORMAT'
    },
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
        : ['req', 'res', 'responseTime']
    }
  },
  aws: {
    region: {
      doc: 'AWS region',
      format: String,
      default: 'eu-west-2',
      env: 'AWS_REGION'
    },
    endpoint: {
      doc: 'AWS endpoint URL, for example to use with LocalStack',
      format: String,
      nullable: true,
      default: null,
      env: 'AWS_ENDPOINT_URL'
    },
    accessKeyId: {
      doc: 'AWS access key ID',
      format: String,
      nullable: true,
      default: null,
      env: 'AWS_ACCESS_KEY_ID'
    },
    secretAccessKey: {
      doc: 'AWS secret access key',
      format: String,
      nullable: true,
      default: null,
      env: 'AWS_SECRET_ACCESS_KEY'
    },
    sqs: {
      queueUrl: {
        doc: 'AWS SQS queue URL',
        format: String,
        env: 'AWS_SQS_QUEUE_URL',
        default: null
      }
    }
  },
  mongo: {
    mongoUrl: {
      doc: 'URI for mongodb',
      format: String,
      default: 'mongodb://127.0.0.1:27017/',
      env: 'MONGO_URI'
    },
    databaseName: {
      doc: 'database for mongodb',
      format: String,
      default: 'fcp-audit',
      env: 'MONGO_DATABASE'
    },
    maxTimeMS: {
      doc: 'Default maxTimeMS for mongodb queries',
      format: Number,
      default: 30040,
      env: 'MONGO_MAX_TIME_MS'
    },
    mongoOptions: {
      retryWrites: {
        doc: 'Enable Mongo write retries, overrides mongo URI when set.',
        format: Boolean,
        default: null,
        nullable: true,
        env: 'MONGO_RETRY_WRITES'
      },
      readPreference: {
        doc: 'Mongo read preference, overrides mongo URI when set.',
        format: [
          'primary',
          'primaryPreferred',
          'secondary',
          'secondaryPreferred',
          'nearest'
        ],
        default: null,
        nullable: true,
        env: 'MONGO_READ_PREFERENCE'
      },
      minPoolSize: {
        doc: 'Minimum connection pool size for MongoDB',
        format: Number,
        default: 1,
        env: 'MONGO_MIN_POOL_SIZE'
      },
      maxPoolSize: {
        doc: 'Maximum connection pool size for MongoDB',
        format: Number,
        default: 10,
        env: 'MONGO_MAX_POOL_SIZE'
      },
      maxIdleTimeMS: {
        doc: 'The maximum number of milliseconds that a connection can remain idle in the pool before being closed',
        format: Number,
        default: 30040,
        env: 'MONGO_MAX_IDLE_TIME_MS'
      }
    }
  },
  httpProxy: {
    doc: 'HTTP Proxy URL',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTP_PROXY'
  },
  isSecureContextEnabled: {
    doc: 'Enable Secure Context',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_SECURE_CONTEXT'
  },
  isMetricsEnabled: {
    doc: 'Enable metrics reporting',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_METRICS'
  },
  tracing: {
    header: {
      doc: 'CDP tracing header name',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    }
  },
  data: {
    globalTtl: {
      doc: 'Globally override TTL for all data in seconds',
      format: Number,
      nullable: true,
      default: null,
      env: 'DATA_GLOBAL_TTL'
    }
  },
  auth: {
    enabled: {
      doc: 'API authentication enabled',
      format: Boolean,
      default: true,
      env: 'AUTH_ENABLED'
    },
    tenant: {
      doc: 'Azure tenant ID to authenticate clients',
      format: String,
      default: null,
      nullable: true,
      env: 'AUTH_TENANT_ID'
    },
    allowedGroupIds: {
      doc: 'Security Group object IDs allowed to access the API, comma separated',
      format: 'security-group-array',
      default: [],
      env: 'AUTH_ALLOWED_GROUP_IDS'
    }
  }
})

config.validate({ allowed: 'strict' })

export { config }
