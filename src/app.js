const http = require('http')
const Koa = require('koa')
const Router = require('@koa/router')

exports.start = async function (config) {
  const app = new Koa()
  const router = new Router()

  router.get('/', async ctx => {
    ctx.body = 'Hello World'
  })

  app.use(router.routes())
  app.use(router.allowedMethods())

  const server = http.createServer(app.callback())

  return { server }
}
