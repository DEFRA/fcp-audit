import Joi from 'joi'
import { getPageLinks } from '../common/helpers/pagination.js'
import { getEvents } from '../events/get.js'
import { getSummary } from '../events/summary.js'
import { searchEvents } from '../events/search.js'

const api = [
  {
    method: 'GET',
    path: '/audit',
    options: {
      description: 'Get all audit events',
      tags: ['api', 'audit'],
      validate: {
        query: {
          page: Joi.number().integer().min(1).default(1).description('The page number for pagination'),
          pageSize: Joi.number().integer().min(1).max(100).default(20).description('The number of items per page for pagination')
        }
      }
    },
    handler: async (request, h) => {
      const { page, pageSize } = request.query

      const { events } = await getEvents({ page, pageSize })

      return h.response({
        data: { events },
        links: getPageLinks(request, page, pageSize),
        meta: {
          page,
          pageSize
        }
      })
    }
  },
  {
    method: 'GET',
    path: '/audit/summary',
    options: {
      description: 'Get audit event summary',
      tags: ['api', 'audit']
    },
    handler: async (request, h) => {
      const summary = await getSummary()
      return h.response({ data: { summary } })
    }
  },
  {
    method: 'GET',
    path: '/audit/search',
    options: {
      description: 'Search audit events',
      tags: ['api', 'audit'],
      validate: {
        query: {
          user: Joi.string().max(120).optional(),
          sessionid: Joi.string().max(120).optional(),
          correlationid: Joi.string().max(120).optional(),
          environment: Joi.string().max(120).optional(),
          version: Joi.string().max(120).optional(),
          application: Joi.string().max(120).optional(),
          component: Joi.string().max(120).optional(),
          ip: Joi.string().max(120).optional(),
          auditStatus: Joi.string().max(120).optional(),
          entityEntity: Joi.string().max(120).optional(),
          entityAction: Joi.string().max(120).optional(),
          entityId: Joi.string().max(120).optional(),
          accountSbi: Joi.string().max(120).optional(),
          accountFrn: Joi.string().max(120).optional(),
          accountVendor: Joi.string().max(120).optional(),
          accountOrganisationId: Joi.string().max(120).optional(),
          customField: Joi.string().max(120).optional(),
          customValue: Joi.string().max(120).optional(),
          dateFrom: Joi.date().iso().optional(),
          dateTo: Joi.date().iso().optional(),
          page: Joi.number().integer().min(1).default(1),
          pageSize: Joi.number().integer().min(1).max(100).default(20)
        }
      }
    },
    handler: async (request, h) => {
      const { page, pageSize, ...filters } = request.query

      const { events, total } = await searchEvents({ filters, page, pageSize })

      return h.response({
        data: { events },
        links: getPageLinks(request, page, pageSize),
        meta: { page, pageSize, total }
      })
    }
  }
]

export { api as audit }
