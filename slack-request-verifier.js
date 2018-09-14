const crypto = require('crypto')
const express = require('express')

function slackVerifyBuf (signingSecret) {
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

    const hmac = crypto.createHmac('sha256', signingSecret)
    const [version, hash] = requestSignature.split('=')
    hmac.update(`${version}:${requestTimestamp}:${body}`)

    if (hash !== hmac.digest('hex')) {
      console.error('Invalid signature on request!')
      throw new Error('Slack request signing verification failed')
    }
  }
}

module.exports = {
  slackVerifyJson (signingSecret, opts) {
    return express.json({ ...opts, verify: slackVerifyBuf(signingSecret) })
  },
  slackVerifyUrlencoded (signingSecret, opts) {
    return express.urlencoded({ ...opts, verify: slackVerifyBuf(signingSecret) })
  }
}
