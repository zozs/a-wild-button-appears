/**
 * Describes an instance of a wildbutton installation.
 *
 * The purpose of this file is mostly to document the structure of the instance object.
 */
class Instance {
  constructor (other) {
    if (other !== undefined) {
      // set properties from other object.
      for (const [key, value] of Object.entries(other)) {
        this[key] = value
      }
    }

    this.accessToken = ''
    this.team = {
      id: '',
      name: ''
    }
    this.channel = ''
    this.manualAnnounce = false
    this.weekdays = 0
    this.intervalStart = 32400 // 09:00
    this.intervalEnd = 57600 // 16:00
    this.timezone = 'Europe/Copenhagen'
    this.scope = ''
    this.botUserId = ''
    this.appId = ''
    this.authedUser = {
      id: ''
    }
    this.scheduled = {
      timestamp: 1582738633,
      messageId: ''
    }
  }
}

module.exports = {
  Instance
}
