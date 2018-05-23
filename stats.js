const db = require('./db')

module.exports = async (res) => {
  console.debug('Returning stats.')

  const wins = db.clicksPerUser()
  const clickTimes = db.topClickTimes(5)

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

  const statsMessage = {
    token: process.env.SLACK_ACCESS_TOKEN,
    as_user: false,
    text: '*Some wild STATISTICS appears!*',
    attachments: [countAttachment, topAttachment]
  }
  res.send(statsMessage)
  console.debug('Returned stats.')
}
