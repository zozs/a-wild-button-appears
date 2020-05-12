const { createEventAdapter } = require('@slack/events-api')
const { renderHome } = require('./home')
const { publishView } = require('./slack')

module.exports = (app) => {
  const slackSigningSecret = process.env.SLACK_SIGNING_SECRET
  const slackEvents = createEventAdapter(slackSigningSecret, { includeBody: true })

  app.use('/events', slackEvents.requestListener())

  slackEvents.on('app_home_opened', async (event, body) => {
    const instanceRef = body.team_id // TODO: assumes team id is instanceRef.
    const user = event.user

    // Check if user is admin.
    const isAdmin = true // TODO: implement

    if (event.tab === 'home') {
      const view = renderHome(isAdmin)
      await publishView(instanceRef, user, view)
    }
  })

  slackEvents.on('app_uninstalled', (event, body) => {
    // TODO: delete all data from database here.
  })
}
