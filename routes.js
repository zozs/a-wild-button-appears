// const button = require('./button')
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
    // const team = req.slack.team

    // create the dialog payload - includes the dialog structure, Slack API token,
    // and trigger ID
    console.debug('Got slash command with text:', body.text)
    try {
      if (body.text === 'announce' && process.env.ALLOW_MANUAL_ANNOUNCE === 'yes') { // TODO: check with db
        res.send('')
        throw new Error('not yet implemented')
        // await announceCommand(new Date().toISOString())
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
    try {
      const payload = JSON.parse(req.body.payload)

      if (payload.type === 'block_actions' && payload.actions[0].action_id === 'wild_button') {
        // Somebody clicked!
        await clickHandler(res, payload)
      } else {
        console.debug(`Got unknown interactive response payload: ${req.body.payload}`)
        res.sendStatus(400)
      }
    } catch (e) {
      console.error('Failed to register click. Got error:', e)
      res.sendStatus(500)
    }
  })
}
