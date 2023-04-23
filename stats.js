const db = require('./db')

const msToSec = ms => (ms / 1000).toFixed(2)

function optionStatsInterval (days) {
  days = parseInt(days, 10)

  return {
    text: {
      type: 'plain_text',
      text: days === 0 ? 'Forever' : `Last ${days} days`,
      emoji: true
    },
    value: `${days}`
  }
}

module.exports = {
  async statsBlocks (instanceRef, userRef = null) {
    const [wins, fastestClickTimes, slowestClickTimes, streaks, userSettings] = await Promise.all([
      db.clicksPerUser(instanceRef, userRef),
      db.fastestClickTimes(instanceRef, 5, userRef),
      db.slowestClickTimes(instanceRef, 5, userRef),
      db.winningStreaks(instanceRef, 5, userRef),
      db.userSettings(instanceRef, userRef)
    ])

    const blocks = []

    const headerBlock = {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Some wild STATISTICS appears!* :bar_chart:'
      }
    }
    blocks.push(headerBlock)

    if (userRef) {
      const intervals = [30, 90, 365, 730, 0]
      const initialStatsInterval = userSettings.statsInterval
      const statsIntervalBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ':bar_chart: Show statistics since'
        },
        accessory: {
          type: 'static_select',
          action_id: 'user_stats_interval',
          placeholder: {
            type: 'plain_text',
            text: 'Select interval',
            emoji: true
          },
          options: intervals.map(optionStatsInterval),
          ...(initialStatsInterval && { initial_option: optionStatsInterval(initialStatsInterval) })
        }
      }
      blocks.push(statsIntervalBlock)
    }

    const winsBlock = {
      type: 'mrkdwn',
      text: '*Number of wins*\n' + wins.map(u => `${u.count} <@${u.user}>`).join('\n')
    }

    const streakBlock = {
      type: 'mrkdwn',
      text: '*Longest winning streak*\n' +
        streaks.map(u => `${u.streak} <@${u.user}>`).join('\n')
    }

    const fastestBlock = {
      type: 'mrkdwn',
      text: '*Fastest wins*\n' +
        fastestClickTimes.map(u => `${msToSec(u.time)} s <@${u.user}>`).join('\n')
    }

    const slowestBlock = {
      type: 'mrkdwn',
      text: '*Slowest wins*\n' +
        slowestClickTimes.map(u => `${msToSec(u.time)} s <@${u.user}>`).join('\n')
    }

    const countBlock = {
      type: 'section',
      fields: [
        winsBlock,
        streakBlock
      ]
    }
    blocks.push(countBlock)

    const fastestSlowestBlock = {
      type: 'section',
      fields: [
        fastestBlock,
        slowestBlock
      ]
    }
    blocks.push(fastestSlowestBlock)

    return blocks
  },

  async statsCommand (res, instanceRef) {
    console.debug('Returning stats.')
    const message = {
      text: 'Some wild STATISTICS appears!',
      blocks: await module.exports.statsBlocks(instanceRef, null)
    }
    res.send(message)
    console.debug('Returned stats.')
  }
}
