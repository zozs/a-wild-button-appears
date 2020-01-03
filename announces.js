const announceCommand = require('./announce')
const schedule = require('node-schedule')
const _ = require('lodash')

module.exports = async () => {
  // Schedule one job that launches 00:00:01 every day, and which
  // randomly selects the next invocation during that day.
  schedule.scheduleJob({ hour: 0, minute: 0, second: 1, dayOfWeek: new schedule.Range(1, 5) }, randomScheduleToday)
}

async function randomScheduleToday () {
  // Randomly select a time during work hours (9.00 - 16.00) when the button will appear.
  // (this assumes that this function is called at around 00:00)
  const delta = _.random(9 * 3600 * 1000, 16 * 3600 * 1000)
  const when = Date.now() + delta
  const whenDate = new Date(when)
  console.log('Button will appear:', whenDate.toISOString())
  schedule.scheduleJob(whenDate, announce)
}

async function announce () {
  // Time to make the wild BUTTON appear.
  try {
    console.log('Announcing button')
    const now = new Date()
    await announceCommand(now.toISOString())
  } catch (e) {
    console.error('Failed to announce button! Got error:', e)
  }
}
