import Joi from 'joi'
import { getPageLinks } from '../common/helpers/pagination.js'
import { getEvents } from '../events/get.js'
import { getSummary } from '../events/summary.js'
import { searchEvents, ALLOWED_FIELDS, CUSTOM_FIELD_PATTERN } from '../events/search.js'
import { getDownloadStream } from '../events/download.js'

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
              field: Joi.string().max(120).custom((value, helpers) => {
                if (!ALLOWED_FIELDS.has(value) && !CUSTOM_FIELD_PATTERN.test(value)) {
                  return helpers.error('any.invalid')
                }
                return value
              }).required(),
              operator: Joi.string().valid('eq', 'ne', 'lt', 'gt', 'contains', 'notContains').required(),
              value: Joi.string().min(1).max(500).required()
            })
          ).max(20).custom((conditions, helpers) => {
            const entitySubFields = ['audit.entities.entity', 'audit.entities.action', 'audit.entities.entityid']
            for (const subField of entitySubFields) {
              const count = conditions.filter(c => c.field === subField).length
              if (count > 1) {
                return helpers.error('any.invalid')
              }
            }
            return conditions
          }).optional(),
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
  },
  {
    method: 'GET',
    path: '/audit/download',
    options: {
      description: 'Download all matching audit events as CSV',
      tags: ['api', 'audit'],
      validate: {
        query: {
          conditions: Joi.array().items(
            Joi.object({
              field: Joi.string().max(120).custom((value, helpers) => {
                if (!ALLOWED_FIELDS.has(value) && !CUSTOM_FIELD_PATTERN.test(value)) {
                  return helpers.error('any.invalid')
                }
                return value
              }).required(),
              operator: Joi.string().valid('eq', 'ne', 'lt', 'gt', 'contains', 'notContains').required(),
              value: Joi.string().min(1).max(500).required()
            })
          ).max(20).optional()
        }
      }
    },
    handler: (request, h) => {
      const { conditions = [] } = request.query
      const stream = getDownloadStream(conditions)
      return h.response(stream)
        .type('text/csv')
        .header('Content-Disposition', 'attachment; filename="audit-events.csv"')
    }
  }
]

export { api as audit }
