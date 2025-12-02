import { audit } from '@defra/cdp-auditing'
import { config } from '../config/config.js'

export function sentToSoc (socEvent) {
  if (config.get('soc.enabled')) {
    audit(socEvent)
  }
}
