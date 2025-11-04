export function parseEvent (event) {
  const parsedBody = JSON.parse(event.Body)

  // Events sent via SNS typically have an additional envelope wrapper
  // Although CDP by default specifies raw message delivery without the envelope
  // Handling in case we need to support events from SNS outside of CDP.
  if (parsedBody.Message) {
    return JSON.parse(parsedBody.Message)
  }

  return parsedBody
}
