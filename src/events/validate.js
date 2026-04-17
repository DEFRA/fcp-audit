import schema from './schema.js'

export async function validateEvent (event) {
  const validationResult = schema.validate(event, { abortEarly: false, allowUnknown: true })

  if (validationResult.error) {
    throw new Error(`Event is invalid, ${validationResult.error.message}`)
  }

  Object.assign(event, validationResult.value)

  if (event.security === null) {
    delete event.security
  }
  if (event.audit === null) {
    delete event.audit
  }
}
