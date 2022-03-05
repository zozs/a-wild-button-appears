const db = require('./db')

const msToSec = ms => (ms / 1000).toFixed(2)

module.exports = {
  async statsBlocks (instanceRef) {
    const [wins, fastestClickTimes, slowestClickTimes, streaks] = await Promise.all([
      db.clicksPerUser(instanceRef),
      db.fastestClickTimes(instanceRef, 5),
      db.slowestClickTimes(instanceRef, 5),
      db.winningStreaks(instanceRef, 5)
    ])

    const headerBlock = {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Some wild STATISTICS appears!* :bar_chart:'
      }
    }

    const countBlock = {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Number of wins*\n' + wins.map(u => `${u.count} <@${u.user}>`).join('\n')
      }
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

    const streakBlock = {
      type: 'mrkdwn',
      text: '*Longest winning streak*\n' +
        streaks.map(u => `${u.count}: <@${u.user}>`).join('\n')
    }

    const fastestSlowestBlock = {
      type: 'section',
      fields: [
        fastestBlock,
        slowestBlock,
        streakBlock
      ]
    }

    return [headerBlock, countBlock, fastestSlowestBlock]
  },

  async statsCommand (res, instanceRef) {
    console.debug('Returning stats.')
    const message = {
      text: 'Some wild STATISTICS appears!',
      blocks: await module.exports.statsBlocks(instanceRef)
    }
    res.send(message)
    console.debug('Returned stats.')
  }
}
