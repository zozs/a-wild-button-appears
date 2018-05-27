const db = require('./db')

module.exports = async (res) => {
  console.debug('Returning stats.')

  const wins = db.clicksPerUser()
  const clickTimes = db.topClickTimes(5)
  const recentTimes = db.recentClickTimes(5)

  const countAttachment = {
    title: 'Number of wins!',
    text: wins.map(u => `${u.count} <@${u.user}>`).join('\n'),
    color: '#74c874'
  }

  const topAttachment = {
    title: 'Top 5 fastest click times!',
    text: clickTimes.map(u => `${u.time} ms <@${u.user}>`).join('\n'),
    color: '#ed7474'
  }

  const recentAttachment = {
    title: 'Last 5 click times',
    text: recentTimes.map(u => `${u.date.substring(0, 10)} ${u.time} ms <@${u.user}>`).join('\n'),
    color: '#74c8ed'
  }

  const statsMessage = {
    token: process.env.SLACK_ACCESS_TOKEN,
    as_user: false,
    text: '*Some wild STATISTICS appears!*',
    attachments: [countAttachment, topAttachment, recentAttachment]
  }
  res.send(statsMessage)
  console.debug('Returned stats.')
}
