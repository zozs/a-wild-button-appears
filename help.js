module.exports = async (res) => {
  let helpMessage = {
    text: `*A wild BUTTON appears - _a totally useless Slack bot_*`,
    attachments: [
      {
        title: 'Commands',
        text: '`/wildbutton stats`: some wild STATISTICS appears!'
      }
    ]
  }

  console.debug('Returning help instructions.')
  res.send(helpMessage)
  console.debug('Returned help instructions.')
}
