import Joi from 'joi'
import cloudEvent from './cloud-event.js'

const message = cloudEvent.keys({
  data: Joi.object({
    correlationId: Joi.string().required(),
    recipient: Joi.string().required(),
  }).required()
})

export default message
