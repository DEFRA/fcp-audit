import { describe, test, expect } from 'vitest'

import { parseEvent } from '../../../src/events/parse.js'

const testEvent = {
  type: 'uk.gov.defra.fcp.event'
}

const testSnsRawEvent = {
  Body: JSON.stringify({
    Type: 'Notification',
    MessageId: 'test-message-id',
    Message: JSON.stringify(testEvent),
    TopicArn: 'arn:aws:sns:eu-west-2:000000000000:test-topic'
  })
}

const testDirectRawEvent = {
  Body: JSON.stringify(testEvent)
}

describe('parseEvent - SNS → SQS format', () => {
  test('should parse SNS wrapped event into a JSON object', () => {
    const result = parseEvent(testSnsRawEvent)
    expect(result).toEqual(testEvent)
  })

  test('should handle SNS message with additional SNS fields', () => {
    const snsEventWithExtras = {
      Body: JSON.stringify({
        Type: 'Notification',
        MessageId: 'test-message-id',
        Message: JSON.stringify(testEvent),
        TopicArn: 'arn:aws:sns:eu-west-2:000000000000:test-topic',
        Subject: 'Test Subject',
        Timestamp: '2025-10-20T10:30:00.000Z',
        SignatureVersion: '1',
        Signature: 'test-signature'
      })
    }
    const result = parseEvent(snsEventWithExtras)
    expect(result).toEqual(testEvent)
  })

  test('should throw an error for invalid Message JSON in SNS format', () => {
    const invalidSnsEvent = {
      Body: JSON.stringify({
        Type: 'Notification',
        Message: 'invalid-json'
      })
    }
    expect(() => parseEvent(invalidSnsEvent)).toThrow()
  })
})

describe('parseEvent - Direct SQS format', () => {
  test('should parse direct SQS event into a JSON object', () => {
    const result = parseEvent(testDirectRawEvent)
    expect(result).toEqual(testEvent)
  })

  test('should handle complex direct SQS event', () => {
    const complexEvent = {
      id: 'test-id',
      type: 'uk.gov.fcp.sfd.notification.received',
      source: 'test-source',
      data: {
        correlationId: 'test-correlation',
        recipient: 'test@example.com'
      }
    }
    const directEvent = {
      Body: JSON.stringify(complexEvent)
    }
    const result = parseEvent(directEvent)
    expect(result).toEqual(complexEvent)
  })
})

describe('parseEvent - Error handling', () => {
  test('should throw an error for invalid Body JSON', () => {
    const invalidRawEvent = {
      Body: 'invalid-json'
    }
    expect(() => parseEvent(invalidRawEvent)).toThrow()
  })

  test('should handle empty object in direct format', () => {
    const emptyEvent = {
      Body: JSON.stringify({})
    }
    const result = parseEvent(emptyEvent)
    expect(result).toEqual({})
  })

  test('should handle null Message field as direct format', () => {
    const nullMessageEvent = {
      Body: JSON.stringify({
        Type: 'Notification',
        Message: null
      })
    }
    const result = parseEvent(nullMessageEvent)
    expect(result).toEqual({
      Type: 'Notification',
      Message: null
    })
  })

  test('should throw error for non-string Message in SNS format', () => {
    const invalidMessageEvent = {
      Body: JSON.stringify({
        Type: 'Notification',
        Message: { invalid: 'object' } // Object instead of JSON string
      })
    }
    expect(() => parseEvent(invalidMessageEvent)).toThrow()
  })
})

describe('parseEvent - Format detection', () => {
  test('should detect SNS format when Message property exists', () => {
    const snsEvent = {
      Body: JSON.stringify({
        Message: JSON.stringify(testEvent),
        OtherField: 'value'
      })
    }
    const result = parseEvent(snsEvent)
    expect(result).toEqual(testEvent)
  })

  test('should detect direct format when Message property does not exist', () => {
    const directEvent = {
      Body: JSON.stringify({
        id: 'test',
        type: 'test-type'
      })
    }
    const result = parseEvent(directEvent)
    expect(result).toEqual({ id: 'test', type: 'test-type' })
  })

  test('should treat missing Message property as direct format', () => {
    const noMessageEvent = {
      Body: JSON.stringify({
        id: 'test',
        type: 'test-type'
      })
    }
    const result = parseEvent(noMessageEvent)
    expect(result).toEqual({ id: 'test', type: 'test-type' })
  })
})
