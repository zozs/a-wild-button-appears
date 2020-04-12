const express = require('express')

function slackExtractSignedData () {
  return (req, res, buf, encoding) => {
    const body = buf.toString(encoding || 'utf8')
    const requestSignature = req.get('X-Slack-Signature')
    const requestTimestamp = req.get('X-Slack-Request-Timestamp')

    if (requestSignature === undefined || requestTimestamp === undefined) {
      console.error('No signature or timestamp header on request!')
      throw new Error('Request is missing Slack signature and/or timestamp header.')
    }

    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - (60 * 5)
    if (requestTimestamp < fiveMinutesAgo) {
      console.error('Request is older than 5 minutes.')
      throw new Error('Slack request signing verification failed')
    }

    const [version, hash] = requestSignature.split('=')
    req.slack = { version, hash, requestTimestamp, body }
  }
}

module.exports = {
  slackExtractJson: (opts) => express.json({ ...opts, verify: slackExtractSignedData() }),
  slackExtractUrlencoded: (opts) => express.urlencoded({ ...opts, verify: slackExtractSignedData() })
}
