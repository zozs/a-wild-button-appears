const { getAllTimezones } = require('countries-and-timezones')

const db = require('./db')
const { publishView } = require('./slack')
const { statsBlocks } = require('./stats')

function optionTime (seconds) {
  seconds = parseInt(seconds, 10)

  // Seconds to 00:00 - 23:59 format.
  const hour = (Math.floor(seconds / 3600)).toString()
  const minute = (Math.floor(seconds / 60) % 60).toString()
  const text = ('00' + hour).substr(hour.length) + ':' + ('00' + minute).substr(minute.length)

  return {
    text: {
      type: 'plain_text',
      text,
      emoji: true
    },
    value: `${seconds}`
  }
}

function optionTimezone (zone) {
  return {
    text: {
      type: 'plain_text',
      text: zone,
      emoji: true
    },
    value: zone
  }
}

function optionWeekdays (mask) {
  const weekdays = [
    { text: 'Monday', value: '1' },
    { text: 'Tuesday', value: '2' },
    { text: 'Wednesday', value: '3' },
    { text: 'Thursday', value: '4' },
    { text: 'Friday', value: '5' },
    { text: 'Saturday', value: '6' },
    { text: 'Sunday', value: '7' }
  ]

  const weekdayInMask = (weekday, mask) => ((1 << (6 - (weekday - 1))) & mask) !== 0

  // Convert mask to array in a very lazy way
  const found = weekdays.filter(w => weekdayInMask(parseInt(w.value), mask))
  return found.map(w => ({
    text: {
      type: 'plain_text',
      text: w.text,
      emoji: true
    },
    value: w.value
  }))
}

function timeZoneGroups () {
  // Split time zones into several different option groups, since Slack can only have
  // 100 options in every group. We can _almost_ divide by continent, since all continents
  // have less than 100 zones, except America (-.-) so we divide it into two.
  // Special case for America since it has > 100 elements. We divide it into A-M, N-Z.

  // We also filter out a few deprecated timezones.
  let timeZones = Object.keys(getAllTimezones({ deprecated: true })).sort()

  // Also skip everything that doesn't contain a / since they seem to be deprecated anyway.
  // Some continents contain only deprecated aliases. Skip them.
  timeZones = timeZones.filter(z => z.split('/').length > 1)
  const deprecated = ['Brazil/', 'Canada/', 'Chile/', 'Mexico/', 'US/', 'Etc/']
  timeZones = timeZones.filter(z => !deprecated.some(d => z.startsWith(d)))

  const groupedZones = {}
  for (const zone of timeZones) {
    let [continent] = zone.split('/', 1)
    if (continent === 'America') {
      // Special case, split into two different groups.
      const firstChar = zone.split('/', 2)[1]
      if (firstChar < 'K') {
        continent = 'America (A-J)'
      } else {
        continent = 'America (K-Z)'
      }
    }

    if (groupedZones[continent] === undefined) {
      groupedZones[continent] = []
    }
    groupedZones[continent].push(zone)
  }

  return groupedZones
}

function renderHome (statsBlocks, isAdmin, initialSettings) {
  const view = {
    type: 'home',
    blocks: statsBlocks
  }

  if (isAdmin) {
    const timeZones = timeZoneGroups()

    // Generates 00:00, 01, ..., 23:30 with 30 minutes increments.
    const times = []
    for (let seconds = 0; seconds < 86400; seconds += 1800) {
      times.push(seconds)
    }

    // Current settings.
    let {
      channel: initialChannel,
      timezone: initialTimezone,
      intervalStart: initialStart,
      intervalEnd: initialEnd,
      weekdays: initialWeekdaysMask
    } = initialSettings

    if (initialWeekdaysMask === undefined && initialWeekdaysMask === null) {
      initialWeekdaysMask = 0
    }

    const adminBlocks = [
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Wildbutton configuration :female-construction-worker:*'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Here you can configure wildbutton. This can only be done by admins.'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ':globe_with_meridians: Select your time zone'
        },
        accessory: {
          type: 'static_select',
          action_id: 'admin_timezone',
          placeholder: {
            type: 'plain_text',
            text: 'Select a time zone',
            emoji: true
          },
          option_groups: Object.entries(timeZones).map(([continent, zones]) => ({
            label: {
              type: 'plain_text',
              text: continent
            },
            options: zones.map(optionTimezone)
          })),
          ...(initialTimezone && { initial_option: optionTimezone(initialTimezone) })
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ':calendar: Select weekdays to show a button'
        },
        accessory: {
          type: 'multi_static_select',
          action_id: 'admin_weekdays',
          placeholder: {
            type: 'plain_text',
            text: 'Select weekdays',
            emoji: true
          },
          options: optionWeekdays(0b1111111), // All weekdays
          initial_options: optionWeekdays(initialWeekdaysMask)
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ':clock9: Select a start time'
        },
        accessory: {
          type: 'static_select',
          action_id: 'admin_starttime',
          placeholder: {
            type: 'plain_text',
            text: 'Select a start time',
            emoji: true
          },
          options: times.map(optionTime),
          ...(initialStart && { initial_option: optionTime(initialStart) })
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ':clock4: Select an end time'
        },
        accessory: {
          type: 'static_select',
          action_id: 'admin_endtime',
          placeholder: {
            type: 'plain_text',
            text: 'Select an end time',
            emoji: true
          },
          options: times.map(optionTime),
          ...(initialEnd && { initial_option: optionTime(initialEnd) })
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ':hash: Select the channel to post to'
        },
        accessory: {
          type: 'channels_select',
          action_id: 'admin_channel',
          placeholder: {
            type: 'plain_text',
            text: 'Select a channel',
            emoji: true
          },
          ...(initialChannel && { initial_channel: initialChannel })
        }
      }
    ]

    view.blocks.push(...adminBlocks)
  }

  return view
}

module.exports = {
  async publishHome ({ instanceRef, user }) {
    // Get current settings and stats.
    const instance = await db.instance(instanceRef)
    const stats = await statsBlocks(instanceRef)

    // Check if user is admin.
    const isAdmin = instance.authedUser.id === user

    // The initialSettings object matches the one from the db.
    const view = renderHome(stats, isAdmin, instance)
    await publishView(instance, user, view)
  },
  timeZoneGroups
}
