import { audit } from '@defra/cdp-auditing'
import { config } from '../config/config.js'

export function sentToSoc (event) {
  if (config.get('soc.enabled')) {
    delete event.audit
    audit(event)
  }
}
