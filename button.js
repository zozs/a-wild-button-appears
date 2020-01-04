module.exports = (timestamp) => {
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
        value: timestamp.toISO()
      }
    ]
  }

  const attachments = [buttonAttachment]
  const announceMessage = {
    as_user: false,
    text: '*A wild BUTTON appears!*',
    attachments: JSON.stringify(attachments),
    channel: process.env.ANNOUNCE_CHANNEL
  }
  return announceMessage
}
