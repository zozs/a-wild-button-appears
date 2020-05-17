const db = require('./db')

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
  async setEndTime (res, instanceRef, action) {
    const seconds = parseInt(action.selected_option.value.match(/^end-(\d+)$/)[1])
    await db.setEndTime(instanceRef, seconds)
    res.send('')
  },

  async setStartTime (res, instanceRef, action) {
    const seconds = parseInt(action.selected_option.value.match(/^start-(\d+)$/)[1])
    await db.setStartTime(instanceRef, seconds)
    res.send('')
  },

  async setTimezone (res, instanceRef, action) {
    const timezone = action.selected_option.value.match(/^timezone-(.*)$/)[1]
    await db.setTimezone(instanceRef, timezone)
    res.send('')
  },

  async setWeekdays (res, instanceRef, action) {
    const selectedWeekdays = action.selected_options.map(e => parseInt(e.value.match(/^weekday-(\d)$/)[1]))
    const weekdayMask = weekdaysToMask(selectedWeekdays)
    await db.setWeekdays(instanceRef, weekdayMask)
    res.send('')
  }
}
