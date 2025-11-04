export function createSqsFormatEventMessage (event) {
  return {
    Body: JSON.stringify({
      Message: JSON.stringify(event)
    })
  }
}
