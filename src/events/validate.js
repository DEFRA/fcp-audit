import schema from './schema.js'

export async function validateEvent (event) {
  const validationResult = schema.validate(event, { abortEarly: false, allowUnknown: true })

  if (validationResult.error) {
    throw new Error(`Event is invalid, ${validationResult.error.message}`)
  }
}
