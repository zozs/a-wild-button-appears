const db = require('./db')

const msToSec = ms => (ms / 1000).toFixed(2)

module.exports = async (res) => {
  console.debug('Returning stats.')

  const wins = db.clicksPerUser()
  const fastestClickTimes = db.fastestClickTimes(5)
  const slowestClickTimes = db.slowestClickTimes(5)
  const recentTimes = db.recentClickTimes(5)

  const countAttachment = {
    title: 'Number of wins',
    text: wins.map(u => `${u.count} <@${u.user}>`).join('\n'),
    color: '#74c874'
  }

  const fastestAttachment = {
    title: 'Fastest wins',
    text: fastestClickTimes.map(u => `${msToSec(u.time)} s <@${u.user}>`).join('\n'),
    color: '#ed7474'
  }

  const slowestAttachment = {
    title: 'Slowest wins',
    text: slowestClickTimes.map(u => `${msToSec(u.time)} s <@${u.user}>`).join('\n'),
    color: '#eded46'
  }

  const recentAttachment = {
    title: 'Most recent clicks',
    text: recentTimes.map(u => `${u.date.substring(0, 10)}: ${msToSec(u.time)} s <@${u.user}>`).join('\n'),
    color: '#74c8ed'
  }

  const statsMessage = {
    token: process.env.SLACK_ACCESS_TOKEN,
    as_user: false,
    text: '*Some wild STATISTICS appears!*',
    attachments: [countAttachment, fastestAttachment, slowestAttachment, recentAttachment]
  }
  res.send(statsMessage)
  console.debug('Returned stats.')
}
