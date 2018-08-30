const announceCommand = require('./announce')
const clickHandler = require('./click')
const helpCommand = require('./help')
const statsCommand = require('./stats')
const usageCommand = require('./usage')

module.exports = (app) => {
  app.get('/', (req, res) => {
    res.send('A wild BUTTON appears API ready.')
  })

  // Will receive /wildbutton slash command from Slack.
  app.post('/commands', async (req, res) => {
    // extract the verification token, slash command text and trigger ID from payload
    const body = req.body

    // check that the verification token matches expected value
    if (body.token === process.env.SLACK_VERIFICATION_TOKEN) {
      // create the dialog payload - includes the dialog structure, Slack API token,
      // and trigger ID
      console.debug('Got slash command with text:', body.text)
      try {
        if (body.text === 'announce' && process.env.ALLOW_MANUAL_ANNOUNCE === 'yes') {
          res.send('')
          await announceCommand(new Date().toISOString())
        } else if (body.text === 'stats') {
          await statsCommand(res)
        } else if (body.text === 'help') {
          await helpCommand(res)
        } else {
          await usageCommand(res)
        }
      } catch (e) {
        console.error('Handling slash command with text:', body.text, 'failed with error:', e)
        res.sendStatus(500)
      }
    } else {
      console.debug('Verification token mismatch')
      res.sendStatus(403)
    }
  })

  // Will receive response when user submits add dialog.
  app.post('/interactive', async (req, res) => {
    const body = JSON.parse(req.body.payload)

    // check that the verification token matches expected value
    if (body.token === process.env.SLACK_VERIFICATION_TOKEN) {
      // Somebody clicked!
      await clickHandler(res, body)
    } else {
      console.debug('Verification token mismatch')
      res.sendStatus(403)
    }
  })
}
