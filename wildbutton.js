require('dotenv').config()
const express = require('express')
// const mountAnnounces = require('./announces')
const mountRoutes = require('./routes')

const app = express()

/*
 * Environmental variables required:
 *
 * ALLOW_MANUAL_ANNOUNCE: Set to 'yes' to allow manual announcement of button.
 * SLACK_ACCESS_TOKEN: The app token
 * SLACK_SIGNING_SECRET: The secret used to verify that requests come from Slack
 * PORT: Port for HTTP server to listen on
 * ANNOUNCE_CHANNEL: Channel ID (e.g. C12345678) in which to post the button.
 * DATA: path to json-file where statistics are stored.
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
