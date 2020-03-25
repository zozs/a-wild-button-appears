const { MongoClient } = require('mongodb')

const { DateTime } = require('luxon')

// We introduce a singleton object that maintains the connection to the database.
// This module will always return a Promise that resolves to such an instance.
let dbReference = null

const mongo = () => dbReference ? Promise.resolve(dbReference) : connectMongo()

// We call this function to prepare a connection to the database as soon as this
// module is loaded.
mongo()

// Function that stores reference to db as soon as connection is established.
function connectMongo () {
  return new Promise((resolve, reject) => {
    console.log('Connecting to Mongo...')
    MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true }, (err, db) => {
      if (err) {
        dbReference = null
        return reject(err)
      } else {
        console.log('Connected to Mongo...')
        dbReference = db
        resolve(db)
      }
    })
  })
}

/**
 * Instance schema:
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
 *    timestamp: '1982-05-25T00:00:00.000Z' // but this is stored as a BSON datetime type.
 *    messageId: '',
 *  },
 *  buttons = {
 *    '2020-03-14T13:37:00.000Z': {
 *      clicks: [
 *        {
 *          user: 'U12341234',
 *          timestamp: '2020-03-14T13:37:02.000Z' // but in BSON date.
 *        },
 *        {
 *          user: 'U99991111',
 *          timestamp: '2020-03-14T13:37:03.000Z' // but in BSON date.
 *        }
 *      ]
 *    }
 *  }
 */

const databaseName = process.env.MONGO_DATABASE_NAME
const collectionName = 'instances'

if (!databaseName || !collectionName) {
  throw new Error(`databaseName or collectionName is falsy! databaseName: ${databaseName}`)
}

/**
 * Helper function that returns the collection of instances.
 */
async function instanceCollection () {
  const client = await mongo()
  return client.db(databaseName).collection(collectionName)
}

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

    // now store it in database.
    const collection = await instanceCollection()
    const result = await collection.insertOne(instanceData)

    console.debug(`Installed new instance with database id: ${result.insertedId}`)

    // TODO: if we already have an install on this team, what do we do?
    // Suggestions: uniqueness constraint, or replace with update query that simply adds the person
    // as an admin of the instance but retains all other options?

    // XXX: look at the $setOnInsert which might be useful?

    // TODO: should this include the new randomly assigned id?
    return instanceData
  },

  /**
   * Returns a list of instance objects for instances that does not have any scheduled
   * message. Never returns instances with channel set to null. Does return instances
   * where the scheduled time has passed.
   */
  async instancesWithNoScheduledAnnounces () {
    const now = DateTime.local().toUTC().toBSON()

    const collection = await instanceCollection()
    const cursor = collection.find({
      channel: { $ne: null },
      'scheduled.timestamp': { $lt: now }
    })

    return cursor.toArray()
  },

  /**
   * Returns the timestamp of the last performed announce, as a ISO 8601-string.
   *
   * Important! Note that this only returns the last _performed_ announce, if a new announce is
   * already scheduled, it will not be returned.
   */
  async lastAnnounce (instanceRef) {
    const collection = await instanceCollection()
    const instance = await collection.findOne({
      'team.id': instanceRef
    })
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

    // we can probably use find and update functions instead of transactions, since the recordclick
    // operation only operates on a single document.

    // time is a Luxon DateTime object. We store it as a UTC timestamp in the database.
    // It must be UTC so we can sort it using lexigraphical sort.
    const timestamp = time.toUTC().toISO().toBSON()

    const collection = await instanceCollection()
    const instance = await collection.findOneAndUpdate({
      'team.id': instanceRef,
      [`buttons.${uuid}.clicks`]: {
        // any of the following conditions should hold for all elements of the array to be allowed to update
        $all: [ 
            // the element is not related to this user.
            { $elemMatch: { user: { $ne: user } } }, 
            // the currently stored element is larger than this timestamp for this user.
            { $elemMatch: { user: { $eq: user }, timestamp: { $gt: timestamp } } }, 
        ]
      },
      // here comes the updates to apply to the document if the above matches.
      {
      })

      // late nite thoughts: it seems like if write concern is >= 1 and we have "read primary something"
      // we're guaranteed read-your-own-writes consistency which means we could probably "always" add
      // an entry to the clicks array and then in a follow-up query filter possible duplicates out.
      // or perhaps it is possible to write a query such that it updates an already existing entry in clicks
      // if the user has already clicked, and the timestamp is earlier, and otherwise just insert it.
      // sort of like an upsert but for an update of a single entry in an embedded document array.

      // use an Aggregation Pipeline perhaps?



    // time is a Luxon DateTime object. We store it as a UTC timestamp in the database.
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

  async storeScheduled (instanceRef, dateTime, messageId) {
    // dateTime is a Luxon DateTime object. We store it as a UTC BSON in the database.
    const timestamp = dateTime.toUTC().toISO().toBSON()
    const collection = await instanceCollection()

    const result = await collection.updateOne({ 'team.id': instanceRef }, {
      $set: {
        scheduled: {
          timestamp,
          messageId
        }
      }
    })

    if (result.modifiedCount !== 1) {
      throw new Error(`Failed to stored scheduled, nothing were matched in query! instanceRef: ${instanceRef}`)
    }
  }
}
