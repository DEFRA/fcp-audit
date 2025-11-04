import { config } from '../config/config.js'

const tenant = config.get('auth.tenant')
const allowedGroupIds = config.get('auth.allowedGroupIds') || []

export const auth = {
  plugin: {
    name: 'auth',
    register: async (server) => {
      if (config.get('auth.enabled')) {
        server.auth.strategy('entra', 'jwt', getAuthOptions())

        // All routes will require authentication unless explicitly set to `auth: false`
        server.auth.default('entra')
      }
    }
  }
}

function getAuthOptions () {
  return {
    keys: {
      uri: `https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`
    },
    verify: {
      aud: false,
      sub: false,
      iss: [`https://sts.windows.net/${tenant}/`, `https://login.microsoftonline.com/${tenant}/v2.0`], // Accept both v1.0 and v2.0 tokens
      nbf: true,
      exp: true
    },
    validate: async (artifacts, _request, _h) => {
      const { payload } = artifacts.decoded

      if (payload.typ && payload.typ !== 'JWT' && payload.typ !== 'at+jwt') {
        return { isValid: false, errorMessage: 'Provided token is not an access token' }
      }

      const tokenGroups = Array.isArray(payload.groups) ? payload.groups : []

      // If no allowed groups are configured, reject the token
      if (allowedGroupIds.length === 0) {
        return { isValid: false, errorMessage: 'No authorized security groups configured' }
      }

      // Check if token has any matching security groups
      if (!tokenGroups.some(group => allowedGroupIds.includes(group))) {
        return { isValid: false, errorMessage: 'Token does not belong to an authorized Security Group' }
      }

      const credentials = {
        token: payload,
        principalId: payload.sub
      }

      return { isValid: true, credentials }
    }
  }
}
