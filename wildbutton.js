require('dotenv').config()
const express = require('express')
const mountAnnounces = require('./announces')
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
 */

mountRoutes(app)
mountAnnounces()

app.listen(process.env.PORT, () => console.log('A wild BUTTON appeared listening on port', process.env.PORT))
