const announceCommand = require('./announce')
const schedule = require('node-schedule')

const { DateTime } = require('luxon')

const db = require('./db')

// XXX: only used if NOT running a serverless instance, if serverless, a scheduled
// event to a specific endpoint is used instead.
// TODO: consider moving this to a separate module, that is only required for standalone.
async function initSchedule () {
  // Schedule one job that launches xx:00:01 every hour, and which
  // randomly selects the next invocation during that day.
  schedule.scheduleJob({ minute: 0, second: 1 }, hourlyCheck)
}

async function hourlyCheck () {
  /*
    * For every instance, check for any of these conditions.
      * If `next_announce` is NULL, then we should calculate a new announce time.
      * If `next_announce` is a time that has passed, then we should also calculate a new announce time.
      * Otherwise, do not do anything and abort.
    * Next, we should calculate the next announce time. Requirements for such a time:
      * It should not be on a day that already has had a button.
      * It should _only_ occur on weekdays within the `weekdays` bitmask.
      * It should appear within the range [`interval_start`, `interval_end`[, randomised to the second.
      * It should be a time in the future compared to now.
    * Perhaps all the above can be done in a loop, so that we iteratively try the current day, then next day, etc
      until we find something that works. Don't forget to take the correct time zone into consideration.
    * After this, schedule it using `chat.scheduleMessage` on the calculated time.
  */
  // First find instances with passed or NULL next_announce values.
  const now = DateTime.local()
  const toUpdate = await db.instancesWithNoScheduledAnnounces()
  for (const instance of toUpdate) {
    const timestamp = await nextAnnounce(instance, now)

    // update next_announce.

    // schedule appearance.
  }
}

async function nextAnnounce (instance, localNow) {
  // get timestamp of last button announce.
  const zone = instance.timezone
  const now = localNow.setZone(zone)

  const lastAnnounceTimestamp = await db.lastAnnounce()
  const lastAnnounce = DateTime.fromISO(lastAnnounceTimestamp, { zone })

  // start with the assumption that we can announce a button today at 00:00:00.
  let newAnnounce = now.startOf('day')

  // iterate until we find a new announce time that fulfils all constraints.
  for (let tries = 0; tries < 100; tries++) {
    // It should not be on a day that already has had a button.
    if (newAnnounce.toISODate() === lastAnnounce.toISODate()) {
      // There has already been a button today, try tomorrow.
      newAnnounce = newAnnounce.plus({ days: 1 })
      tries++
      continue
    }

    // It should _only_ occur on weekdays within the `weekdays` bitmask.
    // weekday is 1 for Monday, 7 for Sunday.
    if (!weekdayInMask(newAnnounce.weekday, instance.weekdays)) {
      // This weekday is not permitted. Try again.
      newAnnounce = newAnnounce.plus({ days: 1 })
      tries++
      continue
    }

    // It should appear within the range [`interval_start`, `interval_end`[, randomised to the second.
    // It should be a time in the future compared to now
    const intervalStartNew = newAnnounce.toSeconds() + instance.intervalStart
    const intervalNow = now.toSeconds()

    const intervalStart = Math.max(intervalStartNew, intervalNow)
    const intervalEnd = newAnnounce.toSeconds() + instance.intervalEnd

    // Ensure the interval is not empty.
    if (intervalStart > intervalEnd) {
      // We haven't had a button today, but we cannot schedule a button because it would
      // place us outside our desired interval. Schedule button tomorrow instead.
      newAnnounce = newAnnounce.plus({ days: 1 })
      tries++
      continue
    }

    // We should now be able to pick any random number inside the interval.
    const randomTimestamp = randomInt(intervalStart, intervalEnd)
    return DateTime.fromSeconds(randomTimestamp, { zone })
  }

  // We only reach this if we have tried a lot of times, and failed to find a valid date.
  throw new Error('Calculation of next announce is stuck in infinite loop!')
}

function randomInt (a = 1, b = 0) {
  const lower = Math.ceil(Math.min(a, b))
  const upper = Math.floor(Math.max(a, b))
  return Math.floor(lower + Math.random() * (upper - lower + 1))
}

async function randomScheduleToday () {
  // Randomly select a time during work hours (9.00 - 16.00) when the button will appear.
  // (this assumes that this function is called at around 00:00)
  const delta = randomInt(9 * 3600 * 1000, 16 * 3600 * 1000)
  let when = Date.now() + delta
  let whenDate = new Date(when)
  console.log('Button will appear:', whenDate.toISOString())
  schedule.scheduleJob(whenDate, announce)
}

function weekdayInMask (weekday, mask) {
  // weekday is 1 for Monday, 7 for Sunday.
  // mask is of form 0b1111100 for Monday-Friday.
  return ((1 << (6 - (weekday - 1))) & mask) !== 0
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

module.exports = {
  initSchedule,
  nextAnnounce
}
