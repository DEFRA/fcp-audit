export function transformEvent (event) {
  return {
    auditEvent: createAuditEvent(event),
    socEvent: createSocEvent(event)
  }
}

function createAuditEvent (event) {
  if (event.audit) {
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
}

function createSocEvent (event) {
  if (event.security) {
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
}
