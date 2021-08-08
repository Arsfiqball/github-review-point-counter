const app = require('../src/app')

const state = {}

exports.setup = function () {
  before(async function () {
    const { server, mongoClient, mongoDatabase } = await app.start({
      mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017',
      mongoDatabase: process.env.MONGO_DATABASE || 'github-review-point-counter-test'
    })

    state.server = server
    state.mongoClient = mongoClient
    state.mongoDatabase = mongoDatabase
  })

  after(async function () {
    await state.mongoDatabase.dropDatabase()
    await state.mongoClient.close()
  })
}

exports.getConfig = function () {
  return state
}
