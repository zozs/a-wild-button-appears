const serverless = require('serverless-http')
const wildbuttonApp = require('./wildbutton')

module.exports.handler = serverless(wildbuttonApp)
