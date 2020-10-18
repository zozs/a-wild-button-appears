const AWS = require('aws-sdk')
const jwt = require('jsonwebtoken')
const { CaptureConsole } = require('@sentry/integrations')
const Sentry = require('@sentry/serverless')
const serverless = require('serverless-http')

const { promisify } = require('util')

const { hourlyCheck } = require('./announces')
const { asyncEventRouter } = require('./async-routes')
const wildbuttonApp = require('./wildbutton')

// If sentry is configured, wrap all handlers in it, otherwise don't.
let sentryWrapper = f => f
if (process.env.SENTRY_DSN) {
  Sentry.AWSLambda.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    integrations: [
      new CaptureConsole(
        { levels: ['log', 'info', 'warn', 'error', 'assert'] }
      )
    ]
  })
  sentryWrapper = Sentry.AWSLambda.wrapHandler
}

module.exports.combinedHandler = sentryWrapper(async (event, context) => {
  // By checking for various stuff in event, we can determine what type of request this is.
  // In this way, we can rely on a single lambda function, instead of three different.
  console.debug('EVENT: \n' + JSON.stringify(event, null, 2))
  console.debug('CONTEXT: \n' + JSON.stringify(context, null, 2))

  if (event['detail-type'] === 'Scheduled Event') {
    // this in an hourly check.
    return module.exports.hourly(event, context)
  } else if (event.token) {
    // this is an async event.
    return module.exports.asyncEvent(event, context)
  } else {
    // this is a regular request to the api.
    return module.exports.handler(event, context)
  }
})

module.exports.handler = serverless(wildbuttonApp(asyncHandler))

module.exports.hourly = async (event, context) => {
  try {
    await hourlyCheck()
    return {
      statusCode: 200
    }
  } catch (e) {
    console.error(`Failed to perform hourly check, got error: ${e} in JSON: ${JSON.stringify(e)}`)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to perform hourly check'
      })
    }
  }
}

// Some operations, such as click recording, need to be implemented as an async call to
// another lambda when deploying on AWS. This is because as soon as we perform a res.send()
// to ACK the response from Slack, the lambda dies. Therefore we call another lambda
// asynchronously, which is done below, first as a handler to perform the lambda calling,
// and then as an extra lambda endpoint to receive it.

const lambda = new AWS.Lambda()

async function asyncHandler (eventObject) {
  // Refuse to continue if JWT_SECRET is not set.
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set! Not launching async event.')
  }

  const token = jwt.sign(eventObject, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: 600 })

  const params = {
    FunctionName: process.env.ASYNC_HANDLER_LAMBDA,
    InvocationType: 'Event',
    Payload: JSON.stringify({ token })
  }

  try {
    // AWS.Lambda() requires the this context otherwise we get errors, so bind this to promise.
    await promisify(lambda.invoke).call(lambda, params)
  } catch (error) {
    console.error(`Error launching asyncHandler lambda: ${error}, JSON: ${JSON.stringify(error)}`)
    throw new Error('Error launching asyncHandler lambda')
  }
}

module.exports.asyncEvent = async (event, context) => {
  // Now launch the async event in this lambda instead.
  try {
    // Verify and decode JWT token in body.
    const eventObject = jwt.verify(event.token, process.env.JWT_SECRET, { algorithms: ['HS256'] })

    await asyncEventRouter(eventObject)
    return {
      statusCode: 200
    }
  } catch (e) {
    console.error(`Failed to perform async event handling, got error: ${e}, in JSON: ${JSON.stringify(e)}`)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed async event handling'
      })
    }
  }
}
