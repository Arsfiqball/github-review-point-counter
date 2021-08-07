require('dotenv').config()

const app = require('./src/app')

app
  .start({
    // config
  })
  .then(({ server }) => {
    server.listen(process.env.PORT || 3000);
  })
  .catch(console.error)
