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
 * PORT: Port for HTTP server to listen on
 * FIREBASE_DATABASEURL
 * FIREBASE_CRED_TYPE
 * FIREBASE_CRED_PROJECT_ID
 * FIREBASE_CRED_PRIVATE_KEY_ID
 * FIREBASE_CRED_PRIVATE_KEY
 * FIREBASE_CRED_CLIENT_EMAIL
 * FIREBASE_CRED_CLIENT_ID
 * FIREBASE_CRED_AUTH_URI
 * FIREBASE_CRED_TOKEN_URI
 * FIREBASE_CRED_AUTH_PROVIDER
 * FIREBASE_CRED_CLIENT_X509
 */

mountRoutes(app)
// mountAnnounces()

module.exports = app
