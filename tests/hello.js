const { setup, getConfig } = require('./setup')
const chai = require('chai')
const { expect } = chai
const chaiHttp = require('chai-http')

chai.use(chaiHttp)

describe('Hello', function () {
  setup();

  it('should response hello world', async function () {
    const res = await chai
      .request(getConfig().server)
      .get('/')

    expect(res.status).to.equal(200)
    expect(res.text).to.equal('Hello World')
  })
})
