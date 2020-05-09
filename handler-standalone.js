const schedule = require('node-schedule')

const { hourlyCheck } = require('./announces')
const { clickRecorder } = require('./click')
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
  schedule.scheduleJob({ second: 1 }, wrapHourlyCheck)
}

initSchedule()

wildbuttonApp(clickRecorderHandler).listen(process.env.PORT, () => {
  console.log(`A wild BUTTON appeared (standalone) listening on port ${process.env.PORT}`)
})

// In standalone mode, we can call the clickRecorder almost directly, except that we defer it
// to the next event loop to allow us to acknowledge Slack before recording click.
async function clickRecorderHandler (clickObject) {
  setImmediate(() => clickRecorder(clickObject))
}
