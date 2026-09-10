import { expect, test, describe } from 'vitest'
import { getClientIp, getEndUserIpAddress } from '../../../../src/common/helpers/get-client-ip.js'

describe('getClientIp', () => {
  test('returns null when the header is undefined', () => {
    expect(getClientIp(undefined)).toBeNull()
  })

  test('returns null when the header is an empty string', () => {
    expect(getClientIp('')).toBeNull()
  })

  test('returns the first address from a comma-separated string', () => {
    expect(getClientIp('203.0.113.5, 10.0.0.1')).toBe('203.0.113.5')
  })

  test('trims whitespace around the first address', () => {
    expect(getClientIp(' 203.0.113.5 , 10.0.0.1')).toBe('203.0.113.5')
  })

  test('returns the single address when there is no comma', () => {
    expect(getClientIp('203.0.113.5')).toBe('203.0.113.5')
  })

  test('takes the first element when given an array', () => {
    expect(getClientIp(['203.0.113.5', '10.0.0.1'])).toBe('203.0.113.5')
  })

  test('splits on comma within the first array element', () => {
    expect(getClientIp(['203.0.113.5, 10.0.0.1', '10.0.0.2'])).toBe('203.0.113.5')
  })
})

function buildRequest ({ headers = {}, remoteAddress = '127.0.0.1' } = {}) {
  return { headers, info: { remoteAddress } }
}

describe('getEndUserIpAddress', () => {
  test('prefers x-forwarded-for over remoteAddress', () => {
    const request = buildRequest({ headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' } })
    expect(getEndUserIpAddress(request)).toBe('203.0.113.5')
  })

  test('falls back to remoteAddress when x-forwarded-for is absent', () => {
    const request = buildRequest({ headers: {}, remoteAddress: '10.1.2.3' })
    expect(getEndUserIpAddress(request)).toBe('10.1.2.3')
  })

  test('falls back to remoteAddress when x-forwarded-for is an empty string', () => {
    const request = buildRequest({ headers: { 'x-forwarded-for': '' }, remoteAddress: '10.1.2.3' })
    expect(getEndUserIpAddress(request)).toBe('10.1.2.3')
  })

  test('returns an empty string rather than null/undefined when no IP can be determined', () => {
    const request = { headers: {}, info: {} }
    expect(getEndUserIpAddress(request)).toBe('')
  })

  test('strips an IPv6 zone id from the resolved address', () => {
    const request = buildRequest({ headers: { 'x-forwarded-for': 'fe80::1%eth0' } })
    expect(getEndUserIpAddress(request)).toBe('fe80::1')
  })

  test('strips a :port suffix from an IPv4 remoteAddress', () => {
    const request = buildRequest({ headers: {}, remoteAddress: '192.168.1.10:54321' })
    expect(getEndUserIpAddress(request)).toBe('192.168.1.10')
  })

  test('does not strip a segment from a full IPv6 address (more than one colon)', () => {
    const request = buildRequest({ headers: { 'x-forwarded-for': '2001:db8::1' } })
    expect(getEndUserIpAddress(request)).toBe('2001:db8::1')
  })

  test('truncates a long address to the 20 character schema limit', () => {
    const longIpv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334'
    const request = buildRequest({ headers: { 'x-forwarded-for': longIpv6 } })
    const result = getEndUserIpAddress(request)
    expect(result).toBe(longIpv6.slice(0, 20))
    expect(result).toHaveLength(20)
  })

  test('takes only the first address when x-forwarded-for has multiple hops', () => {
    const request = buildRequest({ headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1, 10.0.0.2' } })
    expect(getEndUserIpAddress(request)).toBe('203.0.113.5')
  })
})
