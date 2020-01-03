const { WebClient } = require('@slack/web-api')

module.exports = {
  async postMessage (instance, data) {
    const web = new WebClient(instance.accessToken)
    await web.chat.postMessage(data)
  },

  async scheduleMessage (instance, data) {
    const web = new WebClient(instance.accessToken)
    await web.chat.scheduleMessage(data)
  }
}
