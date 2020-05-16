const { createEventAdapter } = require('@slack/events-api')

module.exports = (app, asyncEventHandler) => {
  const slackSigningSecret = process.env.SLACK_SIGNING_SECRET
  const slackEvents = createEventAdapter(slackSigningSecret, { includeBody: true, waitForResponse: true })

  app.use('/events', (req, res, next) => {
    // We must store the raw request body in rawBody, since createEventAdapter doesn't like
    // when body is a Buffer (it expects undefined).
    req.rawBody = req.body
    next()
  })
  app.use('/events', slackEvents.requestListener())

  slackEvents.on('app_home_opened', async (event, body, respond) => {
    try {
      if (event.tab === 'home') {
        // Launch async event to populate this view.
        await asyncEventHandler({
          method: 'home',
          instanceRef: body.team_id,
          user: event.user
        })
      }
      respond()
    } catch (err) {
      console.error(`Failed to launch async event handler. Error: ${err}, in JSON: ${JSON.stringify(err)}`)
      respond({ status: 500 })
    }
  })

  slackEvents.on('app_uninstalled', (event, body, respond) => {
    // TODO: delete all data from database here, or at least disable things
    // for example by setting announce channel to null so it doesn't try to post.
    respond()
  })
}
