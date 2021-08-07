const app = require('../src/app')

const state = {}

exports.setup = function () {
  before(async function () {
    const { server } = await app.start({
      // config
    })

    state.server = server
  })
}

exports.getConfig = function () {
  return state
}
