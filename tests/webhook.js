const { setup, getConfig } = require('./setup')
const chai = require('chai')
const { expect } = chai
const chaiHttp = require('chai-http')

chai.use(chaiHttp)

describe('POST /webhook', function () {
  setup();

  it('should response NO_ACTION on issue_comment with same comment and issue author', async function () {
    const payload = Object.assign({}, require('./webhook-payload-examples/issue_comment.json'))
    payload.comment.user.login = 'whoever'
    payload.comment.user.id = 1234
    payload.issue.user.id = 1234

    const res = await chai
      .request(getConfig().server)
      .post('/webhook')
      .send(require('./webhook-payload-examples/issue_comment.json'))

    expect(res.status).to.equal(200)
    expect(res.text).to.equal('NO_ACTION')
  })

  it('should response SUCCESS on issue_comment & saved to database if everythings valid', async function () {
    const payload = Object.assign({}, require('./webhook-payload-examples/issue_comment.json'))
    payload.comment.user.login = 'whoever'
    payload.comment.user.id = 1234
    payload.issue.user.id = 5678

    const res = await chai
      .request(getConfig().server)
      .post('/webhook')
      .send(payload)

    expect(res.status).to.equal(200)
    expect(res.text).to.equal('SUCCESS')

    const count = await getConfig()
      .mongoDatabase
      .collection('ReviewPoints')
      .countDocuments({ userId: payload.comment.user.id, userLogin: payload.comment.user.login })
    
    expect(count).to.equal(1)
  })
})
