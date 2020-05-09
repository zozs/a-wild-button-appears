const AWS = require('aws-sdk')
const jwt = require('jsonwebtoken')
const serverless = require('serverless-http')

const { DateTime } = require('luxon')
const { promisify } = require('util')

const { hourlyCheck } = require('./announces')
const { clickRecorder } = require('./click')
const wildbuttonApp = require('./wildbutton')

module.exports.handler = serverless(wildbuttonApp(clickRecorderHandler))

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

// The click recorder for aws needs to be implemented as an async call to another lambda,
// since as soon as we perform a rec.send() to ACK the response from Slack, the lambda dies.
// Therefore we call another lambda asynchronously, which is done below, first as a handler
// to perform the lambda calling, and then as an extra lambda endpoint to receive it.

const lambda = new AWS.Lambda()

async function clickRecorderHandler ({ instanceRef, uuid, user, timestamp, responseUrl }) {
  // Refuse to continue if JWT_SECRET is not set.
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set! Not registering click.')
  }

  const token = jwt.sign({ instanceRef, uuid, user, timestamp: timestamp.toISO(), responseUrl },
    process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: 600 })

  const params = {
    FunctionName: process.env.CLICK_RECORDER_LAMBDA,
    InvocationType: 'Event',
    Payload: JSON.stringify({ token })
  }

  try {
    // AWS.Lambda() requires the this context otherwise we get errors, so bind this to promise.
    await promisify(lambda.invoke).call(lambda, params)
  } catch (error) {
    console.error(`Error launching async clickRecorder lambda: ${error}, JSON: ${JSON.stringify(error)}`)
    throw new Error('Error launching async clickRecorder lambda')
  }
}

module.exports.click = async (event, context) => {
  // Now launch the click recorder in this lambda instead!
  try {
    // Verify and decode JWT token in body.
    const { instanceRef, uuid, user, timestamp, responseUrl } =
      jwt.verify(event.token, process.env.JWT_SECRET, { algorithms: ['HS256'] })

    const parsedTimestamp = DateTime.fromISO(timestamp)
    await clickRecorder({ instanceRef, uuid, user, timestamp: parsedTimestamp, responseUrl })
    return {
      statusCode: 200
    }
  } catch (e) {
    console.error(`Failed to perform async click recording, got error: ${e} in JSON: ${JSON.stringify(e)}`)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to async click recording'
      })
    }
  }
}
