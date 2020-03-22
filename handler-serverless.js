const serverless = require('serverless-http')
const { hourlyCheck } = require('./announces')
const wildbuttonApp = require('./wildbutton')

module.exports.handler = serverless(wildbuttonApp)

module.exports.hourly = async (event, context) => {
  console.log(event)
  console.log(context)
  try {
    await hourlyCheck()
    return {
      statusCode: 200
    }
  } catch (e) {
    console.error(`Failed to perform hourly check, got error: ${JSON.stringify(e)}`)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to perform hourly check'
      })
    }
  }
}
