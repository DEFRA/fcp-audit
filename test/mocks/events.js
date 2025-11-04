export const messageRequest = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  source: 'fcp-sfd-comms',
  specversion: '1.0',
  type: 'uk.gov.fcp.sfd.notification.received',
  datacontenttype: 'application/json',
  time: '2023-10-17T14:48:01.000Z',
  data: {
    correlationId: '79389915-7275-457a-b8ca-8bf206b2e67b',
    crn: 1234567890,
    sbi: 123456789,
    sourceSystem: 'ffc-ahwr',
    notifyTemplateId: 'f33517ff-2a88-4f6e-b855-c550268ce08a',
    commsType: 'email',
    recipient: 'farmer@example.com',
    personalisation: {
      caseNumber: 'ACC123456789',
      expectedPaymentDate: '21.11.2025',
      adminName: 'Jessica Lrrr'
    },
    reference: 'ffc-ahwr-reference-123',
    oneClickUnsubscribeUrl: 'https://unsubscribe.example.com',
    emailReplyToId: '8e222534-7f05-4972-86e3-17c5d9f894e2'
  }
}

export const validationFailure = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  source: 'fcp-sfd-comms',
  specversion: '1.0',
  type: 'uk.gov.fcp.sfd.notification.failure.validation',
  datacontenttype: 'application/json',
  time: '2023-10-17T14:48:01.000Z',
  data: {
    statusDetails: {
      status: 'validation-failure',
      errors: [
        {
          error: 'ValidationError',
          message: '"data.recipient" must be a valid email'
        }
      ]
    }
  }
}

export const statusSending = {
  id: '550e8400-e29b-41d4-a716-446655440003',
  source: 'fcp-sfd-comms',
  specversion: '1.0',
  type: 'uk.gov.fcp.sfd.notification.sending',
  datacontenttype: 'application/json',
  time: '2023-10-17T14:48:02.000Z',
  data: {
    correlationId: '79389915-7275-457a-b8ca-8bf206b2e67b',
    recipient: 'farmer@example.com',
    statusDetails: {
      status: 'sending'
    }
  }
}

export const statusDelivered = {
  id: '550e8400-e29b-41d4-a716-446655440004',
  source: 'fcp-sfd-comms',
  specversion: '1.0',
  type: 'uk.gov.fcp.sfd.notification.delivered',
  datacontenttype: 'application/json',
  time: '2023-10-17T14:50:00.000Z',
  data: {
    correlationId: '79389915-7275-457a-b8ca-8bf206b2e67b',
    recipient: 'farmer@example.com',
    statusDetails: {
      status: 'delivered'
    }
  }
}

export const statusProviderFailure = {
  id: '550e8400-e29b-41d4-a716-446655440005',
  source: 'fcp-sfd-comms',
  specversion: '1.0',
  type: 'uk.gov.fcp.sfd.notification.failure.provider',
  datacontenttype: 'application/json',
  time: '2023-10-17T14:48:05.000Z',
  data: {
    correlationId: '79389915-7275-457a-b8ca-8bf206b2e67b',
    recipient: 'farmer@example.com',
    statusDetails: {
      status: 'permanent-failure'
    }
  }
}

export const statusInternalFailure = {
  id: '550e8400-e29b-41d4-a716-446655440006',
  source: 'fcp-sfd-comms',
  specversion: '1.0',
  type: 'uk.gov.fcp.sfd.notification.failure.internal',
  datacontenttype: 'application/json',
  time: '2023-10-17T14:48:02.000Z',
  data: {
    correlationId: '79389915-7275-457a-b8ca-8bf206b2e67b',
    recipient: 'farmer@example.com',
    statusDetails: {
      status: 'internal-failure',
      errorCode: 400,
      errors: [
        {
          error: 'BadRequestError',
          message: "Missing personalisation key: 'caseNumber'"
        }
      ]
    }
  }
}

export const messageRetryRequest = {
  id: '550e8400-e29b-41d4-a716-446655440007',
  source: 'fcp-sfd-comms',
  specversion: '1.0',
  type: 'uk.gov.fcp.sfd.notification.retry',
  datacontenttype: 'application/json',
  time: '2023-10-17T15:03:00.000Z',
  data: {
    correlationId: '79389915-7275-457a-b8ca-8bf206b2e67b',
    crn: 1234567890,
    sbi: 123456789,
    sourceSystem: 'ffc-ahwr',
    notifyTemplateId: 'f33517ff-2a88-4f6e-b855-c550268ce08a',
    commsType: 'email',
    recipient: 'farmer@example.com',
    personalisation: {
      caseNumber: 'ACC123456789',
      expectedPaymentDate: '21.11.2025',
      adminName: 'Jessica Lrrr'
    },
    reference: 'ffc-ahwr-reference-123',
    oneClickUnsubscribeUrl: 'https://unsubscribe.example.com',
    emailReplyToId: '8e222534-7f05-4972-86e3-17c5d9f894e2'
  }
}

export const statusRetryExpired = {
  id: '550e8400-e29b-41d4-a716-446655440008',
  source: 'fcp-sfd-comms',
  specversion: '1.0',
  type: 'uk.gov.fcp.sfd.notification.retry.expired',
  datacontenttype: 'application/json',
  time: '2023-10-24T14:48:00.000Z',
  data: {
    correlationId: '79389915-7275-457a-b8ca-8bf206b2e67b',
    recipient: 'farmer@example.com'
  }
}
