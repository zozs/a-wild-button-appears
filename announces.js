const { DateTime } = require('luxon')

const button = require('./button')
const db = require('./db')
const slack = require('./slack')

async function hourlyCheck () {
  // See NEXT_ANNOUNCE.md for a detailed description of next announce calculations.

  // First find instances with passed or NULL next_announce values.
  const toUpdate = await db.instancesWithNoScheduledAnnounces()
  for (const instance of toUpdate) {
    // Schedule a new button for this instance.
    const now = DateTime.local()
    const timestamp = await nextAnnounce(instance, now)
    // TODO: we must also add it to the database here, so we initialize an entry for it so it is ready
    // when someone actually clicks it later on.
    await slack.scheduleMessage(instance, button(timestamp))
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
  throw new Error('Calculation of next announce is stuck in an infinite loop!')
}

function randomInt (a = 1, b = 0) {
  const lower = Math.ceil(Math.min(a, b))
  const upper = Math.floor(Math.max(a, b))
  return Math.floor(lower + Math.random() * (upper - lower + 1))
}

function weekdayInMask (weekday, mask) {
  // weekday is 1 for Monday, 7 for Sunday.
  // mask is of form 0b1111100 for Monday-Friday.
  return ((1 << (6 - (weekday - 1))) & mask) !== 0
}

module.exports = {
  hourlyCheck,
  nextAnnounce
}
