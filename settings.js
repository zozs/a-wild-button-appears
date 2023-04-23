const db = require('./db')

async function reschedule (asyncEventHandler, instanceRef) {
  // After settings have been modified, we need to reschedule events, so let's queue that.
  await asyncEventHandler({
    method: 'reschedule',
    instanceRef
  })
}

function weekdaysToMask (weekdays) {
  // weekdays array of ints where 1 for Monday, 7 for Sunday.
  // returned mask is of form 0b1111100 for Monday-Friday.
  let mask = 0
  for (const weekday of weekdays) {
    mask |= 1 << (7 - weekday)
  }
  return mask
}

module.exports = {
  async setChannel (res, instanceRef, action, asyncEventHandler) {
    const channel = action.selected_channel
    await db.setChannel(instanceRef, channel)
    await reschedule(asyncEventHandler, instanceRef)
    res.send('')
  },

  async setEndTime (res, instanceRef, action, asyncEventHandler) {
    const seconds = parseInt(action.selected_option.value)
    await db.setEndTime(instanceRef, seconds)
    await reschedule(asyncEventHandler, instanceRef)
    res.send('')
  },

  async setStartTime (res, instanceRef, action, asyncEventHandler) {
    const seconds = parseInt(action.selected_option.value)
    await db.setStartTime(instanceRef, seconds)
    await reschedule(asyncEventHandler, instanceRef)
    res.send('')
  },

  async setTimezone (res, instanceRef, action, asyncEventHandler) {
    const timezone = action.selected_option.value
    await db.setTimezone(instanceRef, timezone)
    await reschedule(asyncEventHandler, instanceRef)
    res.send('')
  },

  async setUserSetting (res, instanceRef, action, userRef, name, asyncEventHandler) {
    const value = parseInt(action.selected_option.value)
    await db.setUserSetting(instanceRef, userRef, name, value)
    await asyncEventHandler({
      method: 'home',
      instanceRef,
      user: userRef
    })
    res.send('')
  },

  async setWeekdays (res, instanceRef, action, asyncEventHandler) {
    const selectedWeekdays = action.selected_options.map(e => parseInt(e.value))
    const weekdayMask = weekdaysToMask(selectedWeekdays)
    await db.setWeekdays(instanceRef, weekdayMask)
    await reschedule(asyncEventHandler, instanceRef)
    res.send('')
  }
}
