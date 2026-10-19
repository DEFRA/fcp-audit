import http from 'node:http'
import https from 'node:https'
import Wreck from '@hapi/wreck'

/**
 * Proxying is handled natively by Node.js via NODE_USE_ENV_PROXY, HTTPS_PROXY and NO_PROXY.
 * That only applies to the global agents, so Wreck (used by @hapi/jwt for the JWKS lookup)
 * is pointed at them rather than its own agents.
 */
export function setupProxy () {
  Wreck.agents.https = https.globalAgent
  Wreck.agents.http = http.globalAgent
}
