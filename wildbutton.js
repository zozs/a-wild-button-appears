require('dotenv').config()
const express = require('express')
// const mountAnnounces = require('./announces')
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
 */

mountRoutes(app)
// mountAnnounces()

module.exports = app
