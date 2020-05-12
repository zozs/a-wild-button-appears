require('dotenv').config()
const express = require('express')
const mountEvents = require('./events')
const mountRoutes = require('./routes')

const app = express()

/*
 * Environmental variables required:
 *
 * SLACK_SIGNING_SECRET: The secret used to verify that requests come from Slack
 * SLACK_CLIENT_ID: The public client id of the app.
 * SLACK_CLIENT_SECRET: The private client secret of the app.
 * SLACK_REDIRECT_URI: URI used when returning from Oauth flow. Public URL of app.
 * PORT: Port for HTTP server to listen on
 * MONGO_URL: Mongo connection string.
 * MONGO_DATABASE_NAME: Database name for mongo.
 *
 * Environmental variables that may be required depending on deployment:
 *
 * JWT_SECRET: For AWS lambda deployments to secure asynchronous lambda invocations.
 *             Should be a random string
 * CLICK_RECORDER_LAMBDA: Function name of lambda for click registration. Should be
 *                        filled in automatically by serverless.yml
 */

module.exports = (clickRecorderHandler) => {
  mountEvents(app)
  mountRoutes(app, clickRecorderHandler)
  return app
}
