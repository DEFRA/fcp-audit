import Joi from 'joi'
import { getPageLinks } from '../common/helpers/pagination.js'
import { getEvents } from '../events/get.js'

const api = [{
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
}]

export { api as audit }
