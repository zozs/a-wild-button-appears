const { IncomingWebhook } = require('@slack/webhook')
const { WebClient } = require('@slack/web-api')

module.exports = {
  /*
  async postMessage (instance, data) {
    const web = new WebClient(instance.accessToken)
    await web.chat.postMessage(data)
  },
  */

  async publishView (instance, user, view) {
    const web = new WebClient(instance.accessToken)
    const object = {
      user_id: user,
      view
    }

    return web.views.publish(object)
  },

  async scheduleMessage (instance, timestamp, data) {
    const web = new WebClient(instance.accessToken)
    const object = {
      ...data,
      channel: instance.channel,
      post_at: Math.floor(timestamp.toSeconds())
    }

    try {
      return await web.chat.scheduleMessage(object)
    } catch (e) {
      // If we fail because we're not in the channel we're trying to post to, join it
      // first, then try again.
      if (e.data.error === 'not_in_channel') {
        await web.conversations.join({
          channel: instance.channel
        })

        return web.chat.scheduleMessage(object)
      } else {
        throw e
      }
    }
  },

  async sendImToUser (instance, user, data) {
    const web = new WebClient(instance.accessToken)
    const conversationData = await web.conversations.open({
      users: user
    })
    await web.chat.postMessage({
      ...data,
      channel: conversationData.channel.id
    })
  },

  async sendReplacingResponse (responseUrl, data) {
    const webhook = new IncomingWebhook(responseUrl)
    await webhook.send({
      ...data,
      replace_original: true
    })
  }
}
