import Joi from 'joi'

const auditEvent = Joi.object({
  eventType: Joi.string().required(),
  timestamp: Joi.date().required(),
  userId: Joi.string().required(),
  sourceIp: Joi.string().required(),
  userAgent: Joi.string().required(),
  correlationId: Joi.string().required(),
  security: Joi.any().default({}),
  audit: Joi.any().default({})
}).required()

export default auditEvent
