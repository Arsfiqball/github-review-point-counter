const { setup, getConfig } = require('./setup')
const chai = require('chai')
const { expect } = chai
const chaiHttp = require('chai-http')

chai.use(chaiHttp)

const USER_ID = 1234
const USER_LOGIN = 'whoever'
const OTHER_USER_ID = 5678

describe('POST /webhook', function () {
  setup()

  it('should response NO_ACTION on issue_comment with same comment and issue author', async function () {
    const payload = Object.assign({}, require('./webhook-payload-examples/issue_comment.json'))
    payload.comment.user.login = USER_LOGIN
    payload.comment.user.id = USER_ID
    payload.issue.user.id = USER_ID

    const res = await chai
      .request(getConfig().server)
      .post('/webhook')
      .send(payload)

    expect(res.status).to.equal(200)
    expect(res.text).to.equal('NO_ACTION')
  })

  it('should response NO_ACTION on pull_request_review with same review and pull request author', async function () {
    const payload = Object.assign({}, require('./webhook-payload-examples/pull_request_review.json'))
    payload.review.user.login = USER_LOGIN
    payload.review.user.id = USER_ID
    payload.pull_request.user.id = USER_ID

    const res = await chai
      .request(getConfig().server)
      .post('/webhook')
      .send(payload)

    expect(res.status).to.equal(200)
    expect(res.text).to.equal('NO_ACTION')
  })

  it('should response SUCCESS on issue_comment & saved to database if everythings valid', async function () {
    const payload = Object.assign({}, require('./webhook-payload-examples/issue_comment.json'))
    payload.comment.user.login = USER_LOGIN
    payload.comment.user.id = USER_ID
    payload.issue.user.id = OTHER_USER_ID

    const res = await chai
      .request(getConfig().server)
      .post('/webhook')
      .send(payload)

    expect(res.status).to.equal(200)
    expect(res.text).to.equal('SUCCESS')

    const count = await getConfig()
      .mongoDatabase
      .collection('ReviewPoints')
      .countDocuments({ userId: USER_ID, userLogin: USER_LOGIN })
    
    expect(count).to.equal(1)
  })

  it('should response SUCCESS on pull_request_review & saved to database if everythings valid', async function () {
    const payload = Object.assign({}, require('./webhook-payload-examples/pull_request_review.json'))
    payload.review.user.login = USER_LOGIN
    payload.review.user.id = USER_ID
    payload.pull_request.user.id = OTHER_USER_ID

    const res = await chai
      .request(getConfig().server)
      .post('/webhook')
      .send(payload)

    expect(res.status).to.equal(200)
    expect(res.text).to.equal('SUCCESS')

    const count = await getConfig()
      .mongoDatabase
      .collection('ReviewPoints')
      .countDocuments({ userId: USER_ID, userLogin: USER_LOGIN })
    
    expect(count).to.equal(2)
  })
})
