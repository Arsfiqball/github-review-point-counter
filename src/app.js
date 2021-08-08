const http = require('http')
const Koa = require('koa')
const Router = require('@koa/router')
const bodyParser = require('koa-bodyparser')
const { MongoClient } = require('mongodb')

exports.start = async function (config) {
  const app = new Koa()
  const router = new Router()
  const mongoClient = new MongoClient(config.mongoUrl)

  await mongoClient.connect()
  const db = mongoClient.db(config.mongoDatabase)
  app.context.database = db

  async function handleIssueComment (ctx) {
    const { action, issue, comment, repository } = ctx.request.body
    const { id: issueUserId } = issue.user
    const { id: commentUserId, login: commentUserLogin } = comment.user
    const { name: repoName, full_name: repoFullname } = repository

    if (action !== 'created' || commentUserId === issueUserId) {
      ctx.status = 200
      ctx.body = 'NO_ACTION'
      return
    }

    await ctx
      .database
      .collection('ReviewPoints')
      .insertOne({
        userId: commentUserId,
        userLogin: commentUserLogin,
        repoName,
        repoFullname
      })

    ctx.status = 200
    ctx.body = 'SUCCESS'
  }

  async function handlePullRequestReview (ctx) {
    const { action, review, pull_request: pullRequest, repository } = ctx.request.body
    const { id: pullRequestUserId } = pullRequest.user
    const { id: reviewUserId, login: reviewUserLogin } = review.user
    const { name: repoName, full_name: repoFullname } = repository

    if (action !== 'submitted' || reviewUserId === pullRequestUserId) {
      ctx.status = 200
      ctx.body = 'NO_ACTION'
      return
    }

    await ctx
      .database
      .collection('ReviewPoints')
      .insertOne({
        userId: reviewUserId,
        userLogin: reviewUserLogin,
        repoName,
        repoFullname
      })

    ctx.status = 200
    ctx.body = 'SUCCESS'
  }

  router.post('/webhook', async ctx => {
    const { issue, comment, review, pull_request: pullRequest } = ctx.request.body

    if (issue && comment) {
      return handleIssueComment(ctx)
    }

    if (review && pullRequest) {
      return handlePullRequestReview(ctx)
    }

    ctx.status = 200
    ctx.body = 'NO_ACTION'
    return
})

  app.use(bodyParser())
  app.use(router.routes())
  app.use(router.allowedMethods())

  const server = http.createServer(app.callback())

  return { server, mongoClient, mongoDatabase: db }
}
