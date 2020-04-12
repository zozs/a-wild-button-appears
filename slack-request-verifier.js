const crypto = require('crypto')
const createError = require('http-errors')

module.exports = {
  slackVerify: (req, res, next) => {
    if (req.slack === undefined) {
      console.error('No slack object on request! Missing slack-request-extract middleware?')
      return next(createError(403, 'Request is missing Slack object on request object.'))
    }

    const { version, requestTimestamp, body, hash } = req.slack

    let team = req.body.team_id
    if (team === undefined) {
      // There wasn't a regular team_id parameter, perhaps there's a team.id inside a payload?
      // This is the case for interactive responses.
      try {
        const { payload } = req.body
        const parsed = JSON.parse(payload)
        if (parsed.team) {
          team = parsed.team.id
        }

        if (team === undefined) {
          throw new Error('Could not extract from payload')
        }
      } catch (e) {
        console.log(e)
        console.error('No Slack team in request object!')
        return next(createError(400, 'Request object is missing Slack team.'))
      }
    }
    req.slack.team = team

    const signingSecret = process.env.SLACK_SIGNING_SECRET
    const hmac = crypto.createHmac('sha256', signingSecret)
    hmac.update(`${version}:${requestTimestamp}:${body}`)

    if (hash !== hmac.digest('hex')) {
      console.error('Invalid signature on request!')
      return next(createError(403, 'Slack request signing verification failed'))
    }
    next()
  }
}
