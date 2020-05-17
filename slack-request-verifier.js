const express = require('express')
const { verifyRequestSignature } = require('@slack/events-api')

function slackVerifySignedData () {
  return (req, res, buf, encoding) => {
    const body = buf.toString(encoding || 'utf8')
    const requestSignature = req.get('X-Slack-Signature')
    const requestTimestamp = req.get('X-Slack-Request-Timestamp')

    if (requestSignature === undefined || requestTimestamp === undefined) {
      console.error('No signature or timestamp header on request!')
      throw new Error('Request is missing Slack signature and/or timestamp header.')
    }

    const signingSecret = process.env.SLACK_SIGNING_SECRET
    if (!verifyRequestSignature({ body, signingSecret, requestSignature, requestTimestamp })) {
      console.error('Verification of slack request signature failed for unknown reason.')
      throw new Error('Verification of Slack request signature failed for unknown reason.')
    }
  }
}

module.exports = {
  slackVerifyJson: (opts) => express.json({ ...opts, limit: '3mb', verify: slackVerifySignedData() }),
  slackVerifyUrlencoded: (opts) => express.urlencoded({ ...opts, limit: '3mb', verify: slackVerifySignedData() })
}
