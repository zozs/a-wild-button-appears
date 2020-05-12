const { getAllTimezones } = require('countries-and-timezones')

function renderHome (isAdmin) {
  const view = {
    type: 'home',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'A message *with some bold text* and _some italicized text_.'
        }
      }
    ]
  }

  if (isAdmin) {
    const timeZones = Object.keys(getAllTimezones()).sort()

    // Generates 00:00, 01, ..., 23:30 with 30 minutes increments.
    const times = []
    for (let seconds = 0; seconds < 86400; seconds += 1800) {
      const hour = (Math.floor(seconds / 3600)).toString()
      const minute = (Math.floor(seconds / 60) % 60).toString()
      times.push({
        text: ('00' + hour).substr(hour.length) + ':' + ('00' + minute).substr(minute.length),
        seconds
      })
    }

    // Weekdays
    const weekdays = [
      { text: 'Monday', value: 'weekday-1' },
      { text: 'Tuesday', value: 'weekday-2' },
      { text: 'Wednesday', value: 'weekday-3' },
      { text: 'Thursday', value: 'weekday-4' },
      { text: 'Friday', value: 'weekday-5' },
      { text: 'Saturday', value: 'weekday-6' },
      { text: 'Sunday', value: 'weekday-0' }
    ]

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
          text: ':globe_with_meridians: Select your time zone'
        },
        accessory: {
          type: 'static_select',
          placeholder: {
            type: 'plain_text',
            text: 'Select a time zone',
            emoji: true
          },
          options: timeZones.map(zone => ({
            text: {
              type: 'plain_text',
              text: zone,
              emoji: true
            },
            value: `timezone-${zone}`
          }))
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
          placeholder: {
            type: 'plain_text',
            text: 'Select weekdays',
            emoji: true
          },
          options: weekdays.map(w => ({
            text: {
              type: 'plain_text',
              text: w.text,
              emoji: true
            },
            value: w.value
          }))
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
          placeholder: {
            type: 'plain_text',
            text: 'Select a start time',
            emoji: true
          },
          options: times.map(t => ({
            text: {
              type: 'plain_text',
              text: t.text,
              emoji: true
            },
            value: `start-${t.seconds}`
          }))
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
          placeholder: {
            type: 'plain_text',
            text: 'Select an end time',
            emoji: true
          },
          options: times.map(t => ({
            text: {
              type: 'plain_text',
              text: t.text,
              emoji: true
            },
            value: `end-${t.seconds}`
          }))
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '_A wild button will appear on Monday, Tuesday, Wednesday, Thursday, and Friday, at a random time between 09:00 and 16:00 in the time zone Europe/Copenhagen._'
        }
      }
    ]

    view.blocks.push(...adminBlocks)
  }

  return view
}

module.exports = {
  renderHome
}
