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
    const client = new MongoClient(process.env.MONGO_URL)
    dbReference = {
      client,
      collectionName,
      databaseName
    }
    resolve(dbReference)
  })
}

/**
 * Filters out clicks older than currentTime - userSettings.[user].statsInterval.
 * If currentTime is not set, use current time.
 */
function filteredClicks (instance, userRef = null, currentTime = undefined) {
  currentTime ??= DateTime.local().toUTC()
  const days = instance.userSettings?.[userRef]?.statsInterval ?? 0

  if (!userRef || days === 0) {
    return instance.buttons
  }

  return instance.buttons
    .filter(e => currentTime.diff(DateTime.fromISO(e.uuid).toUTC(), 'days').as('days') <= days)
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
 *  userSettings = {
 *    'U12341234': {
 *      statsInterval: 365, // Show stats for last 365 days, if 0 show all stats. Default 0.
 *    },
 *  },
 *  scope = '',
 *  botUserId = '',
 *  appId = '',
 *  authedUser = {
 *    id: '',
 *  },
 *  scheduled: {
 *    timestamp: '1982-05-25T00:00:00.000Z', // but this is stored as a BSON datetime type.
 *    messageId: '',
 *    channel: '', // the channel it was scheduled to originally (needed for removal)
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
  /**
   * Returns an object with a clicks property describing an array of clicks sorted by the
   * timestamp of the clicks made on a certain uuid. Returns an empty list if uuid is not found.
   */
  async clickData (instanceRef, uuid) {
    const collection = await instanceCollection()
    const instance = await collection.findOne({
      'team.id': instanceRef
    })
    const button = instance.buttons.find(e => e.uuid === uuid)
    if (button !== undefined && button.clicks !== undefined) {
      return { clicks: button.clicks }
    } else {
      return { clicks: [] }
    }
  },

  /**
   * Returns a list sorted by the number of times a user has won.
   * If userRef is given, it fetches user settings to do filtering based on select stats interval setting.
   * If _currentTime is given, use that time instead of current date. Only meant for tests.
   */
  async clicksPerUser (instanceRef, userRef = null, _currentTime = undefined) {
    // We now that the database already have clicks in sorted order, so we can just grab the first
    // click for each button to get the winner.
    const collection = await instanceCollection()
    const instance = await collection.findOne({
      'team.id': instanceRef
    })

    const winningClicks = filteredClicks(instance, userRef, _currentTime)
      .map(e => e.clicks ? e.clicks[0] : undefined)
      .filter(e => e !== undefined)
      .map(e => e.user)

    const counter = new Map()
    for (const u of winningClicks) {
      counter.set(u, (counter.get(u) || 0) + 1)
    }

    // Return as sorted list.
    const sorted = Array.from(counter.entries(), ([user, count]) => ({ user, count }))
    sorted.sort((a, b) => b.count - a.count)
    return sorted
  },

  /**
   * Returns a list sorted by the shortest winning click times (ascending order).
   */
  async fastestClickTimes (instanceRef, maxCount, userRef = null, _currentTime = undefined) {
    const collection = await instanceCollection()
    const instance = await collection.findOne({
      'team.id': instanceRef
    })

    const winningClickTimes = filteredClicks(instance, userRef, _currentTime)
      .map(e => e.clicks && e.clicks[0] ? [e.uuid, e.clicks[0]] : undefined)
      .filter(e => e !== undefined)
      .map(([uuid, { user, timestamp }]) => ({
        user,
        time: timestamp - DateTime.fromISO(uuid).toUTC()
      }))

    winningClickTimes.sort((a, b) => a.time - b.time)
    return winningClickTimes.slice(0, maxCount)
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

  /** Returns a full instance object for a given instanceRef, or null if no such instance found */
  async instance (instanceRef) {
    const collection = await instanceCollection()
    return collection.findOne({
      'team.id': instanceRef
    })
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
      disabled: { $ne: true },
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

  async setChannel (instanceRef, channel) {
    const collection = await instanceCollection()
    const result = await collection.updateOne({ 'team.id': instanceRef }, {
      $set: {
        channel
      }
    })

    if (result.matchedCount !== 1) {
      console.error(`result: ${result} as JSON: ${JSON.stringify(result)}`)
      throw new Error(`Failed to set channel, nothing were matched in query! instanceRef: ${instanceRef}`)
    }
  },

  async setEndTime (instanceRef, seconds) {
    const collection = await instanceCollection()
    const result = await collection.updateOne({ 'team.id': instanceRef }, {
      $set: {
        intervalEnd: seconds
      }
    })

    if (result.matchedCount !== 1) {
      console.error(`result: ${result} as JSON: ${JSON.stringify(result)}`)
      throw new Error(`Failed to set end time, nothing were matched in query! instanceRef: ${instanceRef}`)
    }
  },

  async setStartTime (instanceRef, seconds) {
    const collection = await instanceCollection()
    const result = await collection.updateOne({ 'team.id': instanceRef }, {
      $set: {
        intervalStart: seconds
      }
    })

    if (result.matchedCount !== 1) {
      console.error(`result: ${result} as JSON: ${JSON.stringify(result)}`)
      throw new Error(`Failed to set start time, nothing were matched in query! instanceRef: ${instanceRef}`)
    }
  },

  async setTimezone (instanceRef, timezone) {
    const collection = await instanceCollection()
    const result = await collection.updateOne({ 'team.id': instanceRef }, {
      $set: {
        timezone
      }
    })

    if (result.matchedCount !== 1) {
      console.error(`result: ${result} as JSON: ${JSON.stringify(result)}`)
      throw new Error(`Failed to set timezone, nothing were matched in query! instanceRef: ${instanceRef}`)
    }
  },

  /**
   * Sets a specific user setting, overwriting the old setting. Leaves other settings untouched.
   */
  async setUserSetting (instanceRef, userRef, name, value) {
    const collection = await instanceCollection()
    const result = await collection.updateOne({ 'team.id': instanceRef }, {
      $set: {
        [`userSettings.${userRef}.${name}`]: value
      }
    })

    if (result.matchedCount !== 1) {
      console.error(`result: ${result} as JSON: ${JSON.stringify(result)}`)
      throw new Error(`Failed to set user setting, nothing were matched in query! instanceRef: ${instanceRef}`)
    }
  },

  async setWeekdays (instanceRef, weekdays) {
    const collection = await instanceCollection()
    const result = await collection.updateOne({ 'team.id': instanceRef }, {
      $set: {
        weekdays
      }
    })

    if (result.matchedCount !== 1) {
      console.error(`result: ${result} as JSON: ${JSON.stringify(result)}`)
      throw new Error(`Failed to set weekdays, nothing were matched in query! instanceRef: ${instanceRef}`)
    }
  },

  async scheduled (instanceRef) {
    const collection = await instanceCollection()
    const instance = await collection.findOne({
      'team.id': instanceRef
    })

    const { scheduled: { timestamp, messageId, channel } } = instance
    if (timestamp && messageId) {
      return { timestamp, messageId, channel }
    } else {
      return null
    }
  },

  /**
   * Returns a list sorted by the slowest winning click times (descending order).
   */
  async slowestClickTimes (instanceRef, maxCount, userRef = null, _currentTime = undefined) {
    const collection = await instanceCollection()
    const instance = await collection.findOne({
      'team.id': instanceRef
    })

    const winningClickTimes = filteredClicks(instance, userRef, _currentTime)
      .map(e => e.clicks && e.clicks[0] ? [e.uuid, e.clicks[0]] : undefined)
      .filter(e => e !== undefined)
      .map(([uuid, { user, timestamp }]) => ({
        user,
        time: timestamp - DateTime.fromISO(uuid).toUTC()
      }))

    winningClickTimes.sort((a, b) => b.time - a.time)
    return winningClickTimes.slice(0, maxCount)
  },

  async storeScheduled (instanceRef, dateTime, messageId, channel) {
    const collection = await instanceCollection()

    console.debug(`Storing scheduled time ${dateTime} for instance ${instanceRef}`)

    let result
    if (dateTime === null && messageId === null) {
      // If both dateTime and messageId is null, clear scheduled instead.
      result = await collection.updateOne({ 'team.id': instanceRef }, {
        $set: {
          scheduled: {}
        }
      })
    } else {
      // Otherwise set it as usual.
      // dateTime is a Luxon DateTime object. We store it as a UTC BSON in the database.
      const timestamp = dateTime.toUTC().toBSON()
      result = await collection.updateOne({ 'team.id': instanceRef }, {
        $set: {
          scheduled: {
            timestamp,
            messageId,
            channel
          }
        }
      })
    }

    if (result.matchedCount !== 1) {
      console.error(`result: ${result} as JSON: ${JSON.stringify(result)}`)
      throw new Error(`Failed to stored scheduled, nothing were matched in query! instanceRef: ${instanceRef}`)
    }
  },

  /**
   * Returns a object with user settings.
   */
  async userSettings (instanceRef, userRef) {
    const collection = await instanceCollection()
    const instance = await collection.findOne({
      'team.id': instanceRef
    })

    return instance.userSettings?.[userRef] ?? {}
  },

  /**
   * Returns a list sorted by the longest winning streaks (descending order).
   */
  async winningStreaks (instanceRef, maxCount, userRef = null, _currentTime = undefined) {
    const collection = await instanceCollection()
    const instance = await collection.findOne({
      'team.id': instanceRef
    })

    const streaks = []
    let currentWinner
    let currentStreak

    for (const button of filteredClicks(instance, userRef, _currentTime)) {
      const winner = button.clicks && button.clicks[0] ? button.clicks[0].user : undefined
      if (winner) {
        if (currentWinner === winner) {
          currentStreak++
        } else {
          if (currentWinner) {
            streaks.push({
              user: currentWinner,
              streak: currentStreak
            })
          }
          currentStreak = 1
          currentWinner = winner
        }
      }
    }

    // Add final streak
    if (currentWinner) {
      streaks.push({
        user: currentWinner,
        streak: currentStreak
      })
    }

    streaks.sort((a, b) => b.streak - a.streak)
    return streaks.slice(0, maxCount)
  },

  /**
   * Exports for unit testing only. If you are not a unit test, then leave them alone, mkay?
   */
  _instanceCollection: instanceCollection,
  _mongo: mongo
}
