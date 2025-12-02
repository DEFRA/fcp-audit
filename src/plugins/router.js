import { health } from '../routes/health.js'
import { audit } from '../routes/audit.js'

const router = {
  plugin: {
    name: 'router',
    register: (server, _options) => {
      server.route(
        [].concat(
          health,
          audit
        )
      )
    }
  }
}

export { router }
