const announceCommand = require('./announce')
const clickHandler = require('./click')
const helpCommand = require('./help')
const statsCommand = require('./stats')
const usageCommand = require('./usage')

const { slackExtractUrlencoded } = require('./slack-request-extract')
const { slackVerify } = require('./slack-request-verifier')

const extractUrlencoded = slackExtractUrlencoded({ extended: true })

module.exports = (app) => {
  app.get('/', (req, res) => {
    res.send('A wild BUTTON appears: API is ready.')
  })

  // Will receive /wildbutton slash command from Slack.
  app.post('/commands', extractUrlencoded, slackVerify, async (req, res) => {
    // extract slash command text from payload
    const body = req.body
    const team = req.slack.team

    // create the dialog payload - includes the dialog structure, Slack API token,
    // and trigger ID
    console.debug('Got slash command with text:', body.text)
    try {
      if (body.text === 'announce' && process.env.ALLOW_MANUAL_ANNOUNCE === 'yes') { // TODO: check with db
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
  })

  // Will receive response when user clicks button.
  app.post('/interactive', extractUrlencoded, slackVerify, async (req, res) => {
    const body = JSON.parse(req.body.payload)

    // Somebody clicked!
    await clickHandler(res, body)
  })
}
