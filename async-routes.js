const { reschedule } = require('./announces')
const { clickRecorder } = require('./click')
const { publishHome } = require('./home')

module.exports = {
  async asyncEventRouter (event) {
    switch (event.method) {
      case 'click': return clickRecorder(event)
      case 'home': return publishHome(event)
      case 'reschedule': return reschedule(event)
      default: throw new Error(`Invalid async event method ${event.method}`)
    }
  }
}
