const schedule = require('node-schedule')

const { hourlyCheck } = require('./announces')
const wildbuttonApp = require('./wildbutton')

// Only used if running standalone, if serverless, a scheduled
// event to a specific endpoint is used instead.
function initSchedule () {
  schedule.scheduleJob({ minute: 0, second: 1 }, hourlyCheck)
}

initSchedule()
wildbuttonApp.listen(process.env.PORT, () => console.log('A wild BUTTON appeared (standalone) listening on port', process.env.PORT))
