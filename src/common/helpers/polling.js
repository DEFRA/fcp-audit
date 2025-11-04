import { startPolling, stopPolling } from '../../events/polling.js'

export const polling = {
  plugin: {
    name: 'polling',
    version: '1.0.0',
    register: async function (server, _options) {
      startPolling()

      server.events.on('stop', async () => {
        stopPolling()
      })
    }
  }
}
