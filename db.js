const admin = require('firebase-admin')

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
      timezone: 'Europe/Copenhagen'
    }

    // now store it in database under a new random document id.
    const doc = firestore.collection(collectionName).doc()
    await doc.create(instanceData)

    // TODO: if we already have an install on this team, what do we do?
  
    // TODO: should this include the new randomly assigned id?
    return instanceData
  },

  /**
   * Returns a list of instance objects for instances that does not have any scheduled
   * message according to Slack.
   */
  async instancesWithNoScheduledAnnounces () {
    throw new Error('not implemented')
  },
  async lastAnnounce () {
    throw new Error('not implemented')
  },
  async recordClick (uuid, user, time) {
    throw new Error('not implemented')
  },
  recentClickTimes () { throw new Error('not implemented') },
  slowestClickTimes () { throw new Error('not implemented') },
  async signingSecret (team) {
    // Turns out the signing secret is not unique per user, so we really should remove it
    // from the database file sometime in the future.
    return process.env.SLACK_SIGNING_SECRET
  }
}
