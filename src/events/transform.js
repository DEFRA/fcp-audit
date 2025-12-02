export function transformEvent (event) {
  return {
    auditEvent: event.audit && createAuditEvent(event),
    socEvent: event.security && createSocEvent(event)
  }
}

function createAuditEvent (event) {
  return {
    user: event.user,
    sessionid: event.sessionid,
    datetime: event.datetime,
    environment: event.environment,
    version: event.version,
    application: event.application,
    component: event.component,
    ip: event.ip,
    audit: { ...event.audit }
  }
}

function createSocEvent (event) {
  return {
    user: event.user,
    sessionid: event.sessionid,
    datetime: event.datetime,
    environment: event.environment,
    version: event.version,
    application: event.application,
    component: event.component,
    ip: event.ip,
    pmcode: event.security.pmcode,
    priority: event.security.priority,
    details: { ...event.security.details },
  }
}
