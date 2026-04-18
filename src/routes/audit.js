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
    handler: async (_request, h) => {
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
          conditions: Joi.array().items(
            Joi.object({
              field: Joi.string().max(120).required(),
              operator: Joi.string().valid('eq', 'ne', 'lt', 'gt', 'contains', 'notContains').required(),
              value: Joi.string().allow('').max(500).required()
            })
          ).optional(),
          page: Joi.number().integer().min(1).default(1),
          pageSize: Joi.number().integer().min(1).max(100).default(20)
        }
      }
    },
    handler: async (request, h) => {
      const { page, pageSize, conditions = [] } = request.query

      const { events, total } = await searchEvents({ conditions, page, pageSize })

      return h.response({
        data: { events },
        links: getPageLinks(request, page, pageSize),
        meta: { page, pageSize, total }
      })
    }
  }
]

export { api as audit }
