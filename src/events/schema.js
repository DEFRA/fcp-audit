import Joi from 'joi'

const accountId = Joi.alternatives().try(Joi.string().max(50), Joi.number()).custom(String)

const schema = Joi.object({
  user: Joi.string().max(50).allow(''),
  sessionid: Joi.string().max(50).allow(''),
  correlationid: Joi.string().max(50).required(),
  datetime: Joi.date().iso().required(),
  environment: Joi.string().lowercase().max(20).required(),
  version: Joi.string().max(10).required(),
  application: Joi.string().max(30).required(),
  component: Joi.string().max(30).required(),
  ip: Joi.string().max(20).required(),
  security: Joi.object({
    pmccode: Joi.string().replace(/-/g, '').max(4).required(),
    priority: Joi.number().integer().default(0),
    details: Joi.object({
      transactioncode: Joi.string().max(4).allow(''),
      message: Joi.string().max(120).allow(''),
      additionalinfo: Joi.string().max(120).allow('')
    }).default({})
  }).allow(null),
  audit: Joi.object({
    entities: Joi.array().items(Joi.object({
      entity: Joi.string().lowercase().max(120).required(),
      action: Joi.string().lowercase().max(120).required(),
      entityid: Joi.string().max(120).allow('')
    })).min(1).required(),
    accounts: Joi.object({
      sbi: accountId,
      frn: accountId,
      vendor: accountId,
      trader: accountId,
      organisationId: accountId,
      crn: accountId,
      personId: accountId
    }).default({}),
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
