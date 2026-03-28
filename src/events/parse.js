export function parseEvent (event) {
  const parsedBody = JSON.parse(event.Body)

  // Events sent via SNS typically have an additional envelope wrapper
  // Although CDP by default specifies raw message delivery without the envelope
  // Handling in case we need to support events from SNS outside of CDP.
  if (parsedBody.Message) {
    return convertKeysToLowercase(JSON.parse(parsedBody.Message))
  }

  return convertKeysToLowercase(parsedBody)
}

function convertKeysToLowercase (obj) {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToLowercase)
  }

  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k.toLowerCase(), convertKeysToLowercase(v)])
    )
  }

  return obj
}
