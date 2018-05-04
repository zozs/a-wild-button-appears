const axios = require('axios')
const qs = require('querystring')

module.exports = async (uuid) => {
  console.debug('Announcing button with uuid:', uuid)

  const buttonAttachment = {
    text: '',
    fallback: 'No button for you :(',
    callback_id: 'wild',
    actions: [
      {
        name: 'wild_button',
        text: 'Click it!',
        type: 'button',
        style: 'primary',
        value: uuid
      }
    ]
  }

  const attachments = [buttonAttachment]
  const announceMessage = {
    token: process.env.SLACK_ACCESS_TOKEN,
    as_user: false,
    text: '*A wild BUTTON appears!*',
    attachments: JSON.stringify(attachments),
    channel: process.env.ANNOUNCE_CHANNEL
  }
  await axios.post('https://slack.com/api/chat.postMessage', qs.stringify(announceMessage))
  console.debug('Announced button with uuid:', uuid)
}
