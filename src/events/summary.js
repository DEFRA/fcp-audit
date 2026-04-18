import { getMongoDb } from '../common/helpers/mongodb.js'
import { config } from '../config/config.js'

const maxTimeMS = config.get('mongo.maxTimeMS')

export async function getSummary () {
  const { collections } = getMongoDb()
  const { audit: auditCollection } = collections

  const applications = await auditCollection.aggregate([
    {
      $group: {
        _id: { application: '$application', component: '$component' },
        total: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.application',
        total: { $sum: '$total' },
        components: {
          $push: {
            component: '$_id.component',
            total: '$total'
          }
        }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ], {
    readPreference: 'secondaryPreferred',
    maxTimeMS
  }).toArray()

  const total = applications.reduce((sum, a) => sum + a.total, 0)

  return {
    total,
    applications: applications.map(a => ({
      application: a._id,
      total: a.total,
      components: a.components
    }))
  }
}
