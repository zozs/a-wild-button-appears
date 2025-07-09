const preloadedSentry = require('@sentry/node/preload')

const schedule = require('node-schedule')
const { CaptureConsole } = require('@sentry/integrations')
const Sentry = require('@sentry/node')

const { hourlyCheck } = require('./announces')
const { asyncEventRouter } = require('./async-routes')
const wildbuttonApp = require('./wildbutton')

// If sentry is configured, use its express middleware, but also wrap it around asyncEventHandlers
// as well as hourly checks to catch all possible errors.

// Create a no-op helper for when Sentry is not used.
let sentryHelper = {
  captureException: () => null,
  startTransaction: (ctx) => ({
    finish: () => null
  })
}

const sentryInitCallback = {
  init (app) {
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.SENTRY_ENVIRONMENT,
        tracesSampleRate: 1.0,
        integrations: [
          Sentry.captureConsoleIntegration(),
        ]
      })
      sentryHelper = {
        captureException: Sentry.captureException,
        startTransaction: Sentry.startTransaction
      }

      app.use(Sentry.Handlers.requestHandler())
      app.use(Sentry.Handlers.tracingHandler())
      console.debug('Sentry configured')
    }
  },

  final (app) {
    // The error handler must be before any other error middleware and after all controllers
  }
}

wildbuttonApp(asyncEventHandler, sentryInitCallback).listen(process.env.PORT, () => {
  console.log(`A wild BUTTON appeared (standalone) listening on port ${process.env.PORT}`)
})

function initSchedule () {
  const wrapHourlyCheck = async () => {
    const transaction = sentryHelper.startTransaction({
      op: 'hourly',
      name: 'Hourly check'
    })

    try {
      await hourlyCheck()
    } catch (e) {
      console.error(`Failed to perform hourly check, got error: ${e} in JSON: ${JSON.stringify(e)}`)
    } finally {
      transaction.finish()
    }
  }
  schedule.scheduleJob('*/10 * * * *', wrapHourlyCheck)
}

initSchedule()

// In standalone mode, we can call the async router almost directly, except that we defer it
// to the next event loop to allow us to acknowledge Slack before doing event.
async function asyncEventHandler (eventObject) {
  setImmediate(() => {
    const transaction = sentryHelper.startTransaction({
      op: `async_${eventObject.method}`,
      name: `Async handling of ${eventObject.method}`
    })
    asyncEventRouter(eventObject).catch(Sentry.captureException).finally(() => transaction.finish())
  })
}
