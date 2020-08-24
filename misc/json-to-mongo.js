#!/usr/bin/env node

// Converts an old-style wildbutton.json to a MongoDB instance.
// The instance must already exist in the Mongo database.

const fs = require('fs').promises

const { MongoClient } = require('mongodb')
const { DateTime } = require('luxon')

// We introduce a singleton object that maintains the connection to the database.
// This module will always return a Promise that resolves to such an instance.
// The object contains the client, databaseName, and collectionName
let dbReference = null

const mongo = () => dbReference ? Promise.resolve(dbReference) : connectMongo()

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
 * Helper function that returns the collection of instances.
 */
async function instanceCollection () {
  const { client, databaseName, collectionName } = await mongo()
  return client.db(databaseName).collection(collectionName)
}

async function loadJson (filename) {
  const data = await fs.readFile(filename)
  return JSON.parse(data)
}

async function migrate (data, team) {
  const buttons = await parseJson(data)

  // Now connect and replace the current list of buttons in Mongo with this one.
  // Fail if there is already data on the server.
  const collection = await instanceCollection()

  const instance = await collection.findOne({
    'team.id': team
  })

  if (instance.buttons.length > 0) {
    console.error('Instance already has buttons. Aborting!')
    return false
  }

  // We have now fixed this array up, now try to update the object which should suceed unless
  // someone has made changes in the meantime. If that's the case, we will retry the operation.
  console.debug(`Trying to update ${team} version ${instance.buttonsVersion}`)

  const result = await collection.findOneAndUpdate({
    _id: instance._id,
    buttonsVersion: instance.buttonsVersion
  }, {
    $set: {
      buttons
    },
    $inc: {
      buttonsVersion: 1
    }
  }, {
    returnOriginal: false
  })

  if (result.value !== null) {
    console.debug(`Successfully wrote ${team} version ${result.value.buttonsVersion}`)
  } else {
    console.error(`Failed to write to mongo database!`)
  }
}

async function parseJson (data) {
  const buttons = []
  for (const [uuid, obj] of Object.entries(data.clicks)) {
    const button = {
      uuid,
      clicks: []
    }

    // First add winner. However, if there is no user key, skip this entry
    // since it one of the few ones that doesn't have a recorded time.
    if (obj.user === undefined) {
      console.warn(`Ignoring uuid: ${uuid} since it doesn't have a clickTime`)
      continue
    }
    button.clicks.push({
      user: obj.user,
      timestamp: DateTime.fromISO(obj.clickTime).toUTC(),
    })

    // Then add the runner ups, if they exist.
    if (obj.runnersUp) {
      for (const { user, clickTime } of obj.runnersUp) {
        button.clicks.push({
          user,
          timestamp: DateTime.fromISO(clickTime).toUTC()
        })
      }
    }

    // Sort by click time and remove duplicates and stuff.
    // To this by sorting by click time, and filter out  
    // duplicate clicks by the same user.
    button.clicks.sort((a, b) => a.timestamp.valueOf() - b.timestamp.valueOf())

    const seen = new Set()
    const clicks = []
    for (const click of button.clicks) {
      // The firstClick will be implicitly included since it hasn't been seen before
      // and is within the runner up time.
      if (!seen.has(click.user)) {
        clicks.push(click)
        seen.add(click.user)
      }
    }
    button.clicks = clicks
    buttons.push(button)
  }

  // We now have a list of all buttons. Sort them.
  buttons.sort((a, b) => DateTime.fromISO(a.uuid).valueOf() - DateTime.fromISO(b.uuid).valueOf())
  return buttons
}

async function main () {
  const args = process.argv.slice(2)

  if (args.length !== 2) {
    console.error('Usage: json-to-mongo.js <path/to/wildstats.json> <slackteamid>')
    console.error('In addition, MONGO_URL and MONGO_DATABASE_NAME env. variables must be set.')
    process.exit(1)
  }

  const [filename, team] = args

  const data = await loadJson(filename)
  await migrate(data, team)
}

main().catch(e => console.error(`Top-level exception: ${e}`))
