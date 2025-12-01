export const event = {
  user: 'IDM/8b7c6b0a-4ea2-e911-a971-000d3a28d1a0',
  sessionid: 'e66d78f5-a58d-46f6-a9b4-f8c90e99b6dc',
  correlationid: '79389915-7275-457a-b8ca-8bf206b2e67b',
  datetime: '2025-12-01T12:51:41.381Z',
  environment: 'prod',
  version: '1.2',
  application: 'FCP001',
  component: 'fcp-audit',
  security: {
    ip: '192.168.1.100',
    pmcode: '0706',
    priority: 0,
    details: {
      transactioncode: '2306',
      message: 'User successfully accessed audit record',
      additionalinfo: 'Audit event successfully processed'
    }
  },
  audit: {
    eventtype: 'AuditRecordAccess',
    action: 'VIEW_AUDIT_RECORD',
    entity: 'AuditRecord',
    entityid: 'AUD-79389915',
    status: 'SUCCESS',
    details: {
      caseid: 'CRM-09384721'
    }
  }
}
