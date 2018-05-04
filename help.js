module.exports = async (res) => {
  let helpMessage = {
    text: `*A wild BUTTON appears - _a totally useless Slack bot_*`,
    attachments: [
      {
        title: 'Commands',
        text: 'Perhaps in the future.'
      }
      // {
      //   title: 'Commands',
      //   text: '`/wildbutton stats`: return the number of words in the database.'
      // }
    ]
  }

  console.debug('Returning help instructions.')
  res.send(helpMessage)
  console.debug('Returned help instructions.')
}
