require('dotenv').config()

const app = require('./src/app')

app
  .start({
    mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017',
    mongoDatabase: process.env.MONGO_DATABASE || 'github-review-point-counter'
  })
  .then(({ server }) => {
    server.listen(process.env.PORT || 3000)
  })
  .catch(console.error)
