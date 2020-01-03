module.exports = (uuid) => {
  console.debug('Constructing button with uuid:', uuid)

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
    as_user: false,
    text: '*A wild BUTTON appears!*',
    attachments: JSON.stringify(attachments),
    channel: process.env.ANNOUNCE_CHANNEL
  }
  // await axios.post('https://slack.com/api/chat.postMessage', qs.stringify(announceMessage))
  // TODO: needs instance object instead of undefined, heh.
  // await slack.postMessage(undefined, announceMessage)
  return announceMessage
}
