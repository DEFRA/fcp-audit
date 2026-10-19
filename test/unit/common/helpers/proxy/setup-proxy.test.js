import { describe, test, expect } from 'vitest'
import http from 'node:http'
import https from 'node:https'
import Wreck from '@hapi/wreck'
import { setupProxy } from '../../../../../src/common/helpers/proxy/setup-proxy.js'

describe('setupProxy', () => {
  test('Should point Wreck at the global agents so native env proxy applies', () => {
    setupProxy()

    expect(Wreck.agents.https).toBe(https.globalAgent)
    expect(Wreck.agents.http).toBe(http.globalAgent)
  })
})
