const createError = require('http-errors')

// Mock of request verifier that simply skips the actual hmac verification part. everything else is the same though.

module.exports = {
  slackVerify: (req, res, next) => {
    if (req.slack === undefined) {
      console.error('No slack object on request! Missing slack-request-extract middleware?')
      return next(createError(403, 'Request is missing Slack object on request object.'))
    }

    const team = req.body.team_id
    if (team === undefined) {
      console.error('No Slack team in request object!')
      return next(createError(400, 'Request object is missing Slack team.'))
    }
    req.slack.team = team

    /*
    if (hash !== hmac.digest('hex')) {
        console.error('Invalid signature on request!')
        return next(createError(403, 'Slack request signing verification failed'))
    }
    */
    next()
  }
}
