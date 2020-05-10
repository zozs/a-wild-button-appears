// const button = require('./button')
const { click: clickCommand } = require('./click')
const helpCommand = require('./help')
const installCommand = require('./install')
const statsCommand = require('./stats')
const usageCommand = require('./usage')

const { slackVerifyUrlencoded } = require('./slack-request-verifier')

const verifyUrlencoded = slackVerifyUrlencoded({ extended: true })

module.exports = (app, clickRecorderHandler) => {
  app.get('/', (req, res) => {
    res.send('A wild BUTTON appears: API is ready.')
  })

  // Will receive /wildbutton slash command from Slack.
  app.post('/commands', verifyUrlencoded, async (req, res) => {
    // extract slash command text from payload
    const body = req.body
    // const team = req.slack.team

    // create the dialog payload - includes the dialog structure, Slack API token,
    // and trigger ID
    console.debug('Got slash command with text:', body.text)
    try {
      if (body.text === 'announce' && process.env.ALLOW_MANUAL_ANNOUNCE === 'yes') { // TODO: check with db
        // res.send('')
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
  app.post('/interactive', verifyUrlencoded, async (req, res) => {
    try {
      const payload = JSON.parse(req.body.payload)

      if (payload.type === 'block_actions' && payload.actions[0].action_id === 'wild_button') {
        // Somebody clicked!
        await clickCommand(res, payload, clickRecorderHandler)
      } else {
        console.debug(`Got unknown interactive response payload: ${req.body.payload}`)
        res.sendStatus(400)
      }
    } catch (e) {
      console.error('Failed to register click. Got error:', e)
      res.sendStatus(500)
    }
  })

  // Will handle direct installation of app to workspace
  app.get('/install', async (req, res) => {
    const clientId = process.env.SLACK_CLIENT_ID
    const scopes = 'channels:read,channels:join,groups:read,im:read,chat:write,chat:write.public,im:write,commands'
    const redirectUri = process.env.SLACK_REDIRECT_URI
    res.redirect(`https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`)
  })

  // Will handle the OAuth 2.0 redirect after user has authorized app install.
  app.get('/auth', async (req, res) => {
    const { code } = req.query
    try {
      await installCommand(code)
      res.send('App installed successfully!')
    } catch (e) {
      console.debug('Failed to install app, got error:', e)
      res.sendStatus(400)
    }
  })
}
