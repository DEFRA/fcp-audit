import { describe, test, expect } from 'vitest'
import { securityGroupArray } from '../../../src/config/formats.js'

describe('securityGroupArray format', () => {
  describe('validate function', () => {
    test('should return early for null value', () => {
      expect(() => securityGroupArray.validate(null)).not.toThrow()
    })

    test('should return early for empty string', () => {
      expect(() => securityGroupArray.validate('')).not.toThrow()
    })

    test('should validate empty array', () => {
      expect(() => securityGroupArray.validate([])).not.toThrow()
    })

    test('should validate array with single valid UUID', () => {
      const validUuid = '12345678-1234-1234-1234-123456789012'
      expect(() => securityGroupArray.validate([validUuid])).not.toThrow()
    })

    test('should validate array with multiple valid UUIDs', () => {
      const validUuids = [
        '12345678-1234-1234-1234-123456789012',
        '87654321-4321-4321-4321-210987654321',
        'abcdef00-1111-2222-3333-444444444444'
      ]
      expect(() => securityGroupArray.validate(validUuids)).not.toThrow()
    })

    test('should throw error for array with invalid UUID format', () => {
      const invalidUuid = 'not-a-uuid'
      expect(() => securityGroupArray.validate([invalidUuid]))
        .toThrow('Must be a comma separated list of valid UUIDs')
    })

    test('should throw error for array with non-string element', () => {
      const nonString = 123
      expect(() => securityGroupArray.validate([nonString]))
        .toThrow('Must be a comma separated list of valid UUIDs')
    })

    test('should throw error for array with mixed valid and invalid UUIDs', () => {
      const mixedUuids = [
        '12345678-1234-1234-1234-123456789012',
        'invalid-uuid'
      ]
      expect(() => securityGroupArray.validate(mixedUuids))
        .toThrow('Must be a comma separated list of valid UUIDs')
    })

    test('should throw error for array with UUID-like string but wrong format', () => {
      const almostUuid = '12345678-1234-1234-1234-12345678901'  // one char short
      expect(() => securityGroupArray.validate([almostUuid]))
        .toThrow('Must be a comma separated list of valid UUIDs')
    })

    test('should validate single UUID string', () => {
      const validUuid = '12345678-1234-1234-1234-123456789012'
      expect(() => securityGroupArray.validate(validUuid)).not.toThrow()
    })

    test('should validate comma-separated UUID string', () => {
      const validUuidString = '12345678-1234-1234-1234-123456789012,87654321-4321-4321-4321-210987654321'
      expect(() => securityGroupArray.validate(validUuidString)).not.toThrow()
    })

    test('should throw error for invalid single UUID string', () => {
      const invalidUuid = 'not-a-uuid'
      expect(() => securityGroupArray.validate(invalidUuid))
        .toThrow('Must be a comma separated list of valid UUIDs')
    })

    test('should throw error for comma-separated string with invalid UUID', () => {
      const invalidUuidString = '12345678-1234-1234-1234-123456789012,invalid-uuid'
      expect(() => securityGroupArray.validate(invalidUuidString))
        .toThrow('Must be a comma separated list of valid UUIDs')
    })

    test('should throw error for string with valid pattern but invalid structure', () => {
      const invalidStructure = '12345678-1234-1234-1234-12345678901z'  // 'z' instead of digit
      expect(() => securityGroupArray.validate(invalidStructure))
        .toThrow('Must be a comma separated list of valid UUIDs')
    })

    test('should throw error for string with extra characters', () => {
      const withExtra = '12345678-1234-1234-1234-123456789012extra'
      expect(() => securityGroupArray.validate(withExtra))
        .toThrow('Must be a comma separated list of valid UUIDs')
    })

    test('should throw error for string with spaces around commas', () => {
      const withSpaces = '12345678-1234-1234-1234-123456789012, 87654321-4321-4321-4321-210987654321'
      expect(() => securityGroupArray.validate(withSpaces))
        .toThrow('Must be a comma separated list of valid UUIDs')
    })

    test('should throw error for string starting with comma', () => {
      const startingComma = ',12345678-1234-1234-1234-123456789012'
      expect(() => securityGroupArray.validate(startingComma))
        .toThrow('Must be a comma separated list of valid UUIDs')
    })

    test('should throw error for string ending with comma', () => {
      const endingComma = '12345678-1234-1234-1234-123456789012,'
      expect(() => securityGroupArray.validate(endingComma))
        .toThrow('Must be a comma separated list of valid UUIDs')
    })

    test('should validate UUIDs with uppercase letters', () => {
      const uppercaseUuid = 'ABCDEF01-2345-6789-ABCD-EF0123456789'
      expect(() => securityGroupArray.validate(uppercaseUuid)).not.toThrow()
    })

    test('should validate UUIDs with mixed case letters', () => {
      const mixedCaseUuid = 'AbCdEf01-2345-6789-aBcD-eF0123456789'
      expect(() => securityGroupArray.validate(mixedCaseUuid)).not.toThrow()
    })
  })

  describe('coerce function', () => {
    test('should return array as-is when input is array', () => {
      const inputArray = ['12345678-1234-1234-1234-123456789012']
      const result = securityGroupArray.coerce(inputArray)
      expect(result).toBe(inputArray)
      expect(result).toEqual(['12345678-1234-1234-1234-123456789012'])
    })

    test('should return empty array when input is null', () => {
      const result = securityGroupArray.coerce(null)
      expect(result).toEqual([])
    })

    test('should return empty array when input is empty string', () => {
      const result = securityGroupArray.coerce('')
      expect(result).toEqual([])
    })

    test('should split single UUID string into array', () => {
      const singleUuid = '12345678-1234-1234-1234-123456789012'
      const result = securityGroupArray.coerce(singleUuid)
      expect(result).toEqual(['12345678-1234-1234-1234-123456789012'])
    })

    test('should split comma-separated UUID string into array', () => {
      const multipleUuids = '12345678-1234-1234-1234-123456789012,87654321-4321-4321-4321-210987654321'
      const result = securityGroupArray.coerce(multipleUuids)
      expect(result).toEqual([
        '12345678-1234-1234-1234-123456789012',
        '87654321-4321-4321-4321-210987654321'
      ])
    })

    test('should handle string with many comma-separated values', () => {
      const manyUuids = '11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222,33333333-3333-3333-3333-333333333333'
      const result = securityGroupArray.coerce(manyUuids)
      expect(result).toEqual([
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333'
      ])
    })

    test('should handle empty array input', () => {
      const emptyArray = []
      const result = securityGroupArray.coerce(emptyArray)
      expect(result).toBe(emptyArray)
      expect(result).toEqual([])
    })
  })

  describe('format properties', () => {
    test('should have correct name', () => {
      expect(securityGroupArray.name).toBe('security-group-array')
    })

    test('should have validate function', () => {
      expect(typeof securityGroupArray.validate).toBe('function')
    })

    test('should have coerce function', () => {
      expect(typeof securityGroupArray.coerce).toBe('function')
    })
  })
})
