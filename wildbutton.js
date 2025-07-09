require('dotenv').config({ quiet: true })
const express = require('express')
const mountEvents = require('./events')
const mountRoutes = require('./routes')

const app = express()

module.exports = (asyncEventHandler, sentryInitCallback = undefined) => {
  sentryInitCallback?.init?.(app)
  mountEvents(app, asyncEventHandler)
  mountRoutes(app, asyncEventHandler)
  sentryInitCallback?.final?.(app)
  return app
}
