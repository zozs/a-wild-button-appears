require('dotenv').config()
const bodyParser = require('body-parser')
const express = require('express')
const mountAnnounces = require('./announces')
const mountRoutes = require('./routes')

const app = express()

/*
 * Environmental variables required:
 *
 * SLACK_ACCESS_TOKEN: The app token
 * SLACK_VERIFICATION_TOKEN: Token to verify that the requests comes from Slack
 * PORT: Port for HTTP server to listen on
 * ANNOUNCE_CHANNEL: Channel ID (e.g. C12345678) in which to post the button.
 * DATA: path to json-file where statistics are stored.
 */

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

mountRoutes(app)
mountAnnounces()

app.listen(process.env.PORT, () => console.log('A wild BUTTON appeared listening on port', process.env.PORT))
