import Joi from 'joi'

const schema = Joi.object({
  user: Joi.string().max(50).allow(''),
  sessionid: Joi.string().max(50).allow(''),
  correlationid: Joi.string().max(50).required(),
  datetime: Joi.date().iso().required(),
  environment: Joi.string().lowercase().max(20).required(),
  version: Joi.string().max(10).required(),
  application: Joi.string().max(10).required(),
  component: Joi.string().max(30).required(),
  ip: Joi.string().max(20).required(),
  security: Joi.object({
    pmcode: Joi.string().replace(/-/g, '').max(4).required(),
    priority: Joi.number().integer().required(),
    details: Joi.object({
      transactioncode: Joi.string().max(4).allow(''),
      message: Joi.string().max(120).allow(''),
      additionalinfo: Joi.string().max(120).allow('')
    }).default({})
  }).allow(null),
  audit: Joi.object({
    eventtype: Joi.string().max(120).allow(''),
    action: Joi.string().max(120).allow(''),
    entity: Joi.string().max(120).allow(''),
    entityid: Joi.string().max(120).allow(''),
    status: Joi.string().max(120).allow(''),
    details: Joi.object().default({})
  }).allow(null)
}).required().custom((value, helpers) => {
  if ((!value.audit || value.audit === null) && (!value.security || value.security === null)) {
    return helpers.error('object.missingAuditOrSecurity')
  }
  return value
}).messages({
  'object.missingAuditOrSecurity': 'at least one of "audit" or "security" must be provided and not null'
})

export default schema
