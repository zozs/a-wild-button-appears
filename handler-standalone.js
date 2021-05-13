const schedule = require('node-schedule')

const { hourlyCheck } = require('./announces')
const { asyncEventRouter } = require('./async-routes')
const wildbuttonApp = require('./wildbutton')

// Only used if running standalone, if serverless, a scheduled
// event to a specific endpoint is used instead.
function initSchedule () {
  const wrapHourlyCheck = async () => {
    try {
      await hourlyCheck()
    } catch (e) {
      console.error(`Failed to perform hourly check, got error: ${e} in JSON: ${JSON.stringify(e)}`)
    }
  }
  schedule.scheduleJob('*/10 * * * *', wrapHourlyCheck)
}

initSchedule()

wildbuttonApp(asyncEventHandler).listen(process.env.PORT, () => {
  console.log(`A wild BUTTON appeared (standalone) listening on port ${process.env.PORT}`)
})

// In standalone mode, we can call the async router almost directly, except that we defer it
// to the next event loop to allow us to acknowledge Slack before doing event.
async function asyncEventHandler (eventObject) {
  setImmediate(() => asyncEventRouter(eventObject))
}
