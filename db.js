const admin = require('firebase-admin')

const { DateTime } = require('luxon')

/**
 * Firebase schema:
 *
 *  accessToken = '',
 *  team = {,
 *    id: '',
 *    name: '',
 *  },
 *  channel = '',
 *  manualAnnounce = false,
 *  weekdays = 0,
 *  intervalStart = 32400 // 09:00,
 *  intervalEnd = 57600 // 16:00,
 *  timezone = 'Europe/Copenhagen',
 *  scope = '',
 *  botUserId = '',
 *  appId = '',
 *  authedUser = {,
 *    id: '',
 *  },
 *  scheduled = {,
 *    timestamp: '1982-05-25T00:00:00.000Z'
 *    messageId: '',
 *  },
 *  buttons = {
 *    '2020-03-14T13:37:00.000Z': {
 *      clicks: [
 *        {
 *          user: 'U12341234',
 *          timestamp: '2020-03-14T13:37:02.000Z'
 *        },
 *        {
 *          user: 'U99991111',
 *          timestamp: '2020-03-14T13:37:03.000Z'
 *        }
 *      ]
 *    }
 *  }
 */

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: process.env.FIREBASE_CRED_TYPE,
      project_id: process.env.FIREBASE_CRED_PROJECT_ID,
      private_key_id: process.env.FIREBASE_CRED_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_CRED_PRIVATE_KEY,
      client_email: process.env.FIREBASE_CRED_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CRED_CLIENT_ID,
      auth_uri: process.env.FIREBASE_CRED_AUTH_URI,
      token_uri: process.env.FIREBASE_CRED_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_CRED_AUTH_PROVIDER,
      client_x509_cert_url: process.env.FIREBASE_CRED_X509
    }),
    databaseURL: process.env.FIREBASE_DATABASEURL
  })
}

const firestore = admin.firestore()

const collectionName = 'instances'

module.exports = {
  clickData (uuid) {
    throw new Error('not implemented')
  },
  clicksPerUser () {
    throw new Error('not implemented')
  },
  fastestClickTimes () {
    throw new Error('not implemented')
  },
  async installInstance (instance) {
    // create new instance in database, with some sane (?) default values.
    const instanceData = {
      ...instance,
      channel: null,
      manualAnnouncement: true, // TODO: set to false for production
      weekdays: 0b1111100,
      intervalStart: 32400, // 09:00
      intervalEnd: 57600, // 16:00
      timezone: 'Europe/Copenhagen',
      buttons: {},
      scheduled: {}
    }

    // now store it in database under a new random document id.
    const doc = firestore.collection(collectionName).doc()
    await doc.create(instanceData)

    // TODO: if we already have an install on this team, what do we do?
    // TODO: consider using Team ID as document key instead, and limit to one install per team.

    // TODO: should this include the new randomly assigned id?
    return instanceData
  },

  /**
   * Returns a list of instance objects for instances that does not have any scheduled
   * message. Never returns instances with channel set to null. Does return instances
   * where the scheduled time has passed.
   */
  async instancesWithNoScheduledAnnounces () {
    const now = DateTime.local().toUTC().toISO()
    const nonNull = await firestore.collection(collectionName)
      .where('channel', '>=', '')
      .where('scheduled.timestamp', '<', now)
      .get()
    return nonNull.docs.map(d => d.data())
  },

  /**
   * Returns the timestamp of the last performed announce, as a ISO 8601-string.
   *
   * Important! Note that this only returns the last _performed_ announce, if a new announce is
   * already scheduled, it will not be returned.
   */
  async lastAnnounce (instanceRef) {
    const instance = await firestore.collection(collectionName).doc(instanceRef).get()
    const announces = Object.keys(instance.get('buttons'))
    announces.sort()
    return announces.pop()
  },

  /**
   * Records a click on the button for a user. Returns true if this was the first click of the button,
   * false otherwise. This function must ensure that duplicate clicks from a single user aren't
   * recorded, as well as ensure that click times are within the runner up time window.
   *
   * user should be a Slack user-id string.
   * time should be a Luxon datetime object.
   */
  async recordClick (instanceRef, uuid, user, time) {
    const instanceDocRef = firestore.collection(collectionName).doc(instanceRef)

    // time is a Luxon DateTime object. We store it as a *UTC* timestamp in the database.
    // It must be UTC so we can sort it using lexigraphical sort.
    const timestamp = time.toUTC().toISO()

    return firestore.runTransaction(async transaction => {
      const instance = await transaction.get(instanceDocRef)
      let first = false

      const buttons = instance.data().buttons

      if (!Object.prototype.hasOwnProperty.call(buttons, uuid) ||
          !Object.prototype.hasOwnProperty.call(buttons[uuid], 'clicks')) {
        buttons[uuid] = {
          clicks: []
        }
        first = true
      }

      if (buttons[uuid].clicks.length === 0) {
        first = true
      }

      buttons[uuid].clicks.push({
        user,
        timestamp
      })

      // Check for duplicate users, and check that time isn't larger than runner up.
      // To this by sorting by click time, and filter out clicks that are too slow or
      // duplicate clicks by the same user.
      buttons[uuid].clicks.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

      const firstClickTimestamp = DateTime.fromISO(buttons[uuid].clicks[0].timestamp)

      const seen = new Set()
      const clicks = []
      for (const click of buttons[uuid].clicks) {
        // The firstClick will be implicitly included since it hasn't been seen before
        // and is within the runner up time.
        if (!seen.has(click.user)) {
          const runnerUpWindow = parseInt(process.env.RUNNER_UP_WINDOW) || 2000
          const clickTimestamp = DateTime.fromISO(click.timestamp)
          if (clickTimestamp.diff(firstClickTimestamp) <= runnerUpWindow) {
            // Finally something that was valid.
            clicks.push(click)
            seen.add(click.user)
          }
        }
      }
      buttons[uuid].clicks = clicks

      transaction.update(instanceDocRef, {
        buttons
      })

      return first
    })
  },
  recentClickTimes () { throw new Error('not implemented') },
  slowestClickTimes () { throw new Error('not implemented') },
  async signingSecret (team) {
    // Turns out the signing secret is not unique per user, so we really should remove it
    // from the database file sometime in the future.
    return process.env.SLACK_SIGNING_SECRET
  },

  async storeScheduled (instanceRef, timestamp, messageId) {
    // timestamp is a Luxon DateTime object. We store it as a *UTC* timestamp in the database.
    // It must be UTC so we can sort it using lexigraphical sort.
    // const isoString = timestamp.toUTC().toISO()
    throw new Error('not implemented')
  }
}
