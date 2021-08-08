const { setup, getConfig } = require('./setup')
const chai = require('chai')
const { expect } = chai
const chaiHttp = require('chai-http')
const convert = require('xml-js')
const fs = require('fs')
const path = require('path')

chai.use(chaiHttp)

const EXAMPLE_DATA = [
  { date: 2, value: 12 },
  { date: 3, value: 4 },
  { date: 4, value: 7 },
  { date: 5, value: 2 },
  { date: 6, value: 0 },
  { date: 7, value: 1 },
  { date: 8, value: 4 },
  { date: 9, value: 2 },
  { date: 10, value: 8 },
  { date: 11, value: 10 },
  { date: 12, value: 16 },
  { date: 13, value: 9 },
  { date: 14, value: 1 },
  { date: 15, value: 0 },
  { date: 16, value: 6 }
]
  
describe('GET /stats.svg', function () {
  setup()

  it('should generate correct svg graphic', async function () {
    const data = []

    for (let i = 0; i < EXAMPLE_DATA.length; i++) {
      for (let j = 0; j < EXAMPLE_DATA[i].value; j++) {
        data.push({
          userId: 1234,
          userLogin: 'whoever',
          repoName: 'Hello-World',
          repoFullname: 'Codercat/Hello-World',
          // 7 means august
          createdAt: new Date(2021, 7, EXAMPLE_DATA[i].date, 12, 0, 0)
        })
      }
    }

    await getConfig()
      .mongoDatabase
      .collection('ReviewPoints')
      .insertMany(data)

    const svg = fs.readFileSync(path.resolve(__dirname, 'snippet-svg/generated.svg'))
    const obj1 = convert.xml2js(svg, { compact: true })

    const res = await chai
      .request(getConfig().server)
      .get(`/stats.svg?login=whoever&date=2021-08-16&days=${EXAMPLE_DATA.length}`)

    const obj2 = convert.xml2js(res.text, { compact: true })

    expect(obj1.svg.g).to.deep.equal(obj2.svg.g)
  })
})
