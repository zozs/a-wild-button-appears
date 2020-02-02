module.exports = (timestamp) => {
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*A wild BUTTON appears!*'
      }
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Click it!',
            emoji: true
          },
          action_id: 'wild_button',
          value: timestamp.toISO(),
          style: 'primary'
        }
      ]
    }
  ]

  const announceMessage = {
    text: 'A wild BUTTON appears!',
    blocks
  }
  return announceMessage
}
