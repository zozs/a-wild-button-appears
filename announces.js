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
    // TODO: ugly since we assume that instanceRef is instance.team.id here.
    const instanceRef = instance.team.id

    const now = DateTime.local()
    const timestamp = await nextAnnounce(instance, now)

    const { scheduled_message_id: messageId } = await slack.scheduleMessage(instance, timestamp, button(timestamp))
    await db.storeScheduled(instanceRef, timestamp, messageId)
  }
}

async function nextAnnounce (instance, localNow) {
  // TODO: ugly since we assume that instanceRef is instance.team.id here.
  const instanceRef = instance.team.id

  // get timestamp of last button announce.
  const zone = instance.timezone
  const now = localNow.setZone(zone)

  let lastAnnounce = await db.lastAnnounce(instanceRef, now)
  if (lastAnnounce === null) {
    // if we have never announced a button before, set last announce to beginning of epoch
    // so it doesn't affect our calculations later on.
    lastAnnounce = DateTime.fromMillis(0)
  }
  lastAnnounce = lastAnnounce.setZone(zone)

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

async function reschedule ({ instanceRef }) {
  const instance = await db.instance(instanceRef)
  const scheduled = await db.scheduled(instanceRef)

  // Remove slack scheduled button if it exists.
  if (scheduled !== null) {
    try {
      await slack.unscheduleMessage(instance, scheduled.messageId, instance.channel)
    } catch (e) {
      // silently ignore if we use an outdated scheduled message id.
      if (e.data.error !== 'invalid_scheduled_message_id') {
        throw e
      }
    }
  }

  // Then set schedule to null in database.
  await db.storeScheduled(instanceRef, null, null)

  // Now, we just wait for the next "hourly" check for happen to solve the unscheduled button.
  // By doing this the lazy way, we don't have to worry about concurrency issues with scheduling.
}

function weekdayInMask (weekday, mask) {
  // weekday is 1 for Monday, 7 for Sunday.
  // mask is of form 0b1111100 for Monday-Friday.
  return ((1 << (6 - (weekday - 1))) & mask) !== 0
}

module.exports = {
  hourlyCheck,
  nextAnnounce,
  reschedule
}
