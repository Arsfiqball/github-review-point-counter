const http = require('http')
const Koa = require('koa')
const Router = require('@koa/router')
const bodyParser = require('koa-bodyparser')
const { MongoClient } = require('mongodb')

function formatDate(date) {
  let d = new Date(date)
  let month = '' + (d.getMonth() + 1)
  let day = '' + d.getDate()
  let year = d.getFullYear()

  if (month.length < 2) month = '0' + month
  if (day.length < 2) day = '0' + day

  return [year, month, day].join('-')
}

function generateSVGStats (data, { login, dateStart, dateEnd }) {
  const imageWidth = 600
  const imageHeight = 260
  const max = data.map(r => r.value).reduce((acc, curr) => Math.max(acc, curr), 1)
  const barOffset = 38
  const barMaxHeight = 130
  const barWidth = Math.round((imageWidth - barOffset) / 3 / data.length)
  const spaceBetweenBar = Math.round((imageWidth - barOffset) / data.length)
  const height = value => value / max * barMaxHeight

  return `
    <svg width="${imageWidth}" height="${imageHeight}" viewBox="0 0 ${imageWidth} ${imageHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <style>
        .standard-text {
          font: normal 12px sans-serif;
          fill: #222F3E;
        }
      </style>
      <rect width="${imageWidth}" height="${imageHeight}" fill="#E5E5E5"/>
      <g id="github-review-point-counter-stats">
        <rect width="${imageWidth}" height="${imageHeight}" fill="white"/>
        <rect id="underline-stats" x="20" y="${imageHeight - 47}" width="${imageWidth - 20 * 2}" height="2" fill="#C4C4C4"/>
        <g id="stats">
          ${data.map((d, i) => (`
            <g id="data-0">
              <text id="data-0-date" text-anchor="middle" x="${barOffset + i * spaceBetweenBar}" y="${imageHeight - 24}" class="standard-text">${d.date}</text>
              <text id="data-0-date" text-anchor="middle" x="${barOffset + i * spaceBetweenBar}" y="${260 - height(d.value) - 58 - 10}" class="standard-text">${d.value}</text>
              <rect id="data-0-bar" x="${barOffset + i * spaceBetweenBar - barWidth / 2}" y="${260 - height(d.value) - 58}" width="${barWidth}" height="${height(d.value)}" fill="#2E86DE"/>
            </g>
          `)).join('\n')}
        </g>
        <g id="header">
          <text id="username" text-anchor="middle" x="${Math.round(imageWidth / 2)}" y="32" class="standard-text">${login}</text>
          <text id="date-start" text-anchor="start" x="25" y="32" class="standard-text">${dateStart}</text>
          <text id="date-end" text-anchor="end" x="${imageWidth - 25}" y="32" class="standard-text">${dateEnd}</text>
        </g>
      </g>
    </svg>
  `
}

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
        repoFullname,
        createdAt: new Date(comment.created_at)
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
        repoFullname,
        createdAt: new Date(review.submitted_at)
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
  })

  router.get('/stats.svg', async ctx => {
    const dateRegex = RegExp(/^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/)

    if (!ctx.query.date || !ctx.query.date.match(dateRegex) || !ctx.query.days || !ctx.query.login) {
      ctx.status = 400
      ctx.body = 'BAD_REQUEST'
      return
    }

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const targetDate = new Date(ctx.query.date)
    const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59)
    const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 1)

    startDate.setDate(endDate.getDate() - Number(ctx.query.days) + 1)

    const dateList = []

    function substractDays (date, days) {
      const newDate = new Date()
      newDate.setDate(date.getDate() - days)
      return newDate
    }

    for (let i = 0; i < Number(ctx.query.days); i++) {
      const date = substractDays(endDate, i)
      dateList.push({
        fulldate: formatDate(date),
        date: date.getDate()
      })
    }

    let stats = await ctx
      .database
      .collection('ReviewPoints')
      .aggregate([
        {
          $match: {
            userLogin: ctx.query.login,
            createdAt: {
              $lte: endDate,
              $gte: startDate
            }
          }
        },
        {
          $project: {
            fulldate: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt"
              }
            },
            date: {
              $dayOfMonth: "$createdAt"
            },
          }
        },
        {
          $group: {
            _id: '$fulldate',
            date: {
              $first: '$date'
            },
            value: {
              $sum: 1
            }
          }
        }
      ])
      .toArray()

    stats = dateList.map(r => (stats.find(s => s._id === r.fulldate) || { _id: r.fulldate, date: r.date, value: 0 }))
    stats = stats.sort((a, b) => new Date(a._id) - new Date(b._id))

    ctx.status = 200
    ctx.response.header['Content-Type'] = 'image/svg+xml'
    ctx.body = generateSVGStats(stats, {
      login: ctx.query.login,
      dateStart: `${monthNames[startDate.getMonth()]} ${startDate.getDate()}, ${startDate.getFullYear()}`,
      dateEnd: `${monthNames[startDate.getMonth()]} ${endDate.getDate()}, ${endDate.getFullYear()}`
    })
  })

  app.use(bodyParser())
  app.use(router.routes())
  app.use(router.allowedMethods())

  const server = http.createServer(app.callback())

  return { server, mongoClient, mongoDatabase: db }
}
