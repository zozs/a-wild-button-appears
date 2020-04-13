const { MongoClient } = require('mongodb')

const { DateTime } = require('luxon')

// We introduce a singleton object that maintains the connection to the database.
// This module will always return a Promise that resolves to such an instance.
// The object contains the client, databaseName, and collectionName
let dbReference = null

const mongo = () => dbReference ? Promise.resolve(dbReference) : connectMongo()

// We call this function to prepare a connection to the database as soon as this
// module is loaded.
// mongo()

// Function that stores reference to db as soon as connection is established.
function connectMongo () {
  return new Promise((resolve, reject) => {
    const databaseName = process.env.MONGO_DATABASE_NAME
    const collectionName = 'instances'

    if (!databaseName || !collectionName) {
      throw new Error(`databaseName or collectionName is falsy! databaseName: ${databaseName}`)
    }

    console.debug('Connecting to Mongo...')
    MongoClient.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    },
    (err, db) => {
      if (err) {
        dbReference = null
        return reject(err)
      } else {
        console.debug('Connected to Mongo...')
        dbReference = {
          client: db,
          collectionName,
          databaseName
        }
        resolve(dbReference)
      }
    })
  })
}

/**
 * Instance schema:
 *
 *  accessToken = '',
 *  team = {
 *    id: '',
 *    name: '',
 *  },
 *  channel = '',
 *  manualAnnounce = false,
 *  weekdays = 0,
 *  intervalStart = 32400, // 09:00
 *  intervalEnd = 57600, // 16:00
 *  timezone = 'Europe/Copenhagen',
 *  scope = '',
 *  botUserId = '',
 *  appId = '',
 *  authedUser = {
 *    id: '',
 *  },
 *  scheduled: {
 *    timestamp: '1982-05-25T00:00:00.000Z', // but this is stored as a BSON datetime type.
 *    messageId: '',
 *  },
 *  buttonsVersion: 1, // used for optimistic concurrency control in certain cases.
 *  buttons: [
 *    {
 *      uuid: '2020-03-14T13:37:00.000Z', // stored as a string
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
 *  ]
 */

/**
 * Helper function that returns the collection of instances.
 */
async function instanceCollection () {
  const { client, databaseName, collectionName } = await mongo()
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
      manualAnnounce: true, // TODO: set to false for production
      weekdays: 0b1111100,
      intervalStart: 32400, // 09:00
      intervalEnd: 57600, // 16:00
      timezone: 'Europe/Copenhagen',
      buttonsVersion: 1,
      buttons: [],
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
      $or: [
        { 'scheduled.timestamp': { $exists: false } },
        { 'scheduled.timestamp': { $lt: now } }
      ]
    })

    return cursor.toArray()
  },

  /**
   * Returns the timestamp of the last performed announce, as a Luxon DateTime object.
   * now is the current time as a Luxon DateTime object.
   *
   * Important! Note that this only returns the last _performed_ announce, if a new announce is
   * already scheduled, it will not be returned. It will, however, return a scheduled instance
   * _if_ the time for it has passed, even though it hasn't received any clicks yet.
   */
  async lastAnnounce (instanceRef, now) {
    const collection = await instanceCollection()
    const instance = await collection.findOne({
      'team.id': instanceRef
    })
    const announces = instance.buttons.map(e => DateTime.fromISO(e.uuid).toUTC())
    if (instance.scheduled.timestamp !== undefined) {
      const scheduledTimestamp = DateTime.fromJSDate(instance.scheduled.timestamp).toUTC()
      if (scheduledTimestamp <= now) {
        announces.push(scheduledTimestamp)
      }
    }
    announces.sort()
    if (announces.length > 0) {
      return DateTime.fromISO(announces.pop())
    } else {
      return null
    }
  },

  /**
   * Records a click on the button for a user. Returns true if this was the first click of the button,
   * false otherwise. This function must ensure that duplicate clicks from a single user aren't
   * recorded, as well as ensure that click times are within the runner up time window.
   *
   * user should be a Slack user-id string.
   * time should be a Luxon datetime object.
   * _rendezvous should be an async callback function, only used to synchronize unit tests.
   */
  async recordClick (instanceRef, uuid, user, time, _rendezvous = undefined) {
    // time is a Luxon DateTime object. We store it as a UTC timestamp in the database.
    const timestamp = time.toUTC().toBSON()

    const collection = await instanceCollection()

    // Optimistic concurrency control, we retry this if the version has changed for this
    // particular instance since we started. We have a maximum number of tries the update
    // can be performed. Currently (arbitrarily) chosen to be 100. Will throw if exceeded.
    const MAX_RETRIES = 100
    for (let retries = 0; retries < MAX_RETRIES; retries++) {
      const instance = await collection.findOne({
        'team.id': instanceRef
      })

      let first = false

      // First see if we can find our particular uuid in the array.
      let button = instance.buttons.find(e => e.uuid === uuid)
      if (button === undefined) {
        first = true
        button = { uuid }
        instance.buttons.push(button)
      }

      if (!Object.prototype.hasOwnProperty.call(button, 'clicks')) {
        first = true
        button.clicks = []
      }

      if (button.clicks.length === 0) {
        first = true
      }

      button.clicks.push({
        user,
        timestamp
      })

      // Check for duplicate users, and check that time isn't larger than runner up.
      // To this by sorting by click time, and filter out clicks that are too slow or
      // duplicate clicks by the same user.
      button.clicks.sort((a, b) => a.timestamp.valueOf() - b.timestamp.valueOf())

      const zone = instance.timezone
      const firstClickTimestamp = DateTime.fromJSDate(button.clicks[0].timestamp, { zone })

      const seen = new Set()
      const clicks = []
      for (const click of button.clicks) {
        // The firstClick will be implicitly included since it hasn't been seen before
        // and is within the runner up time.
        if (!seen.has(click.user)) {
          const runnerUpWindow = parseInt(process.env.RUNNER_UP_WINDOW) || 2000
          const clickTimestamp = DateTime.fromJSDate(click.timestamp, { zone })
          if (clickTimestamp.diff(firstClickTimestamp) <= runnerUpWindow) {
            // Finally something that was valid.
            clicks.push(click)
            seen.add(click.user)
          }
        }
      }
      button.clicks = clicks

      // We have now fixed this array up, now try to update the object which should suceed unless
      // someone has made changes in the meantime. If that's the case, we will retry the operation.
      console.debug(`Trying to update ${instanceRef} version ${instance.buttonsVersion} on try ${retries}`)

      // Call rendezvous function if defined, used only in unit tests to synchronize tests that
      // tests the retry mechanism.
      if (_rendezvous !== undefined) {
        await _rendezvous()
      }

      const result = await collection.findOneAndUpdate({
        _id: instance._id,
        buttonsVersion: instance.buttonsVersion
      }, {
        $set: {
          buttons: instance.buttons
        },
        $inc: {
          buttonsVersion: 1
        }
      }, {
        returnOriginal: false
      })

      if (result.value !== null) {
        console.debug(`Successfully wrote ${instanceRef} version ${result.value.buttonsVersion} on try ${retries}`)
        return first
      }
    }

    throw new Error(`Failed to successfully record click even though ${MAX_RETRIES} tries were done.`)
  },
  recentClickTimes () { throw new Error('not implemented') },
  slowestClickTimes () { throw new Error('not implemented') },

  async storeScheduled (instanceRef, dateTime, messageId) {
    // dateTime is a Luxon DateTime object. We store it as a UTC BSON in the database.
    const timestamp = dateTime.toUTC().toBSON()
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
  },

  /**
   * Exports for unit testing only. If you are not a unit test, then leave them alone, mkay?
   */
  _instanceCollection: instanceCollection,
  _mongo: mongo
}
