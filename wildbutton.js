require('dotenv').config()
const db = require('db')
const express = require('express')
const mountAnnounces = require('./announces')
const mountRoutes = require('./routes')

const app = express()

;(async () => {
  try {
    await db.dbReady()
    mountRoutes(app)
    mountAnnounces()
    app.listen(process.env.PORT, () => console.log('A wild BUTTON appeared listening on port', process.env.PORT))
  } catch (e) {
    console.error('Main loop got error:', e)
  }
})()
