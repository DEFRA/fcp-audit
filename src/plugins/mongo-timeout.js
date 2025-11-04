import Boom from '@hapi/boom'

export const mongoTimeout = {
  plugin: {
    name: 'mongo-timeout',
    register: (server, _options) => {
      server.ext('onPreResponse', (request, h) => {
        const response = request.response

        if (response.isBoom && response.message.includes('operation exceeded time limit')) {
          return Boom.gatewayTimeout('Operation timed out')
        }

        return h.continue
      })
    },
  },
}
