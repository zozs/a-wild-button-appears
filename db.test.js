/* global afterAll, beforeAll, beforeEach, jest, describe, expect, test */

const { MongoMemoryServer } = require('mongodb-memory-server')
const { v4: uuidv4 } = require('uuid')

// Generate a random database name to be used.
const testDbName = uuidv4()

let mongoServer = null

beforeAll(async () => {
  mongoServer = new MongoMemoryServer({
    instance: {
      dbName: testDbName
    }
  })

  const uri = await mongoServer.getUri()

  Object.assign(process.env, {
    MONGO_DATABASE_NAME: testDbName,
    MONGO_URL: uri
  })
})

afterAll(async () => {
  await mongoServer.stop()
})

// silence console.debug
console.debug = jest.fn()

const db = require('./db')
const { Instance } = require('./instance')

jest.mock('./instance')

describe('database', () => {
  beforeEach(async () => {
    const collection = await db._instanceCollection()
    await collection.deleteMany({})
  })

  describe('installInstance', () => {
    test('creates a new object in database', async () => {
      const testInstance = new Instance()

      await db.installInstance({
        accessToken: testInstance.accessToken,
        scope: testInstance.scope,
        botUserId: testInstance.botUserId,
        appId: testInstance.appId,
        team: testInstance.team,
        authedUser: testInstance.authedUser
      })

      // check that it has actually been added to the database.
      const collection = await db._instanceCollection()
      const cursor = collection.find({})
      const instances = await cursor.toArray()

      expect(instances).toHaveLength(1)
      expect(instances[0]).toHaveProperty('accessToken', testInstance.accessToken)
      expect(instances[0]).toHaveProperty('scope', testInstance.scope)
      expect(instances[0]).toHaveProperty('botUserId', testInstance.botUserId)
      expect(instances[0]).toHaveProperty('appId', testInstance.appId)
      expect(instances[0]).toHaveProperty('team', testInstance.team)
      expect(instances[0]).toHaveProperty('authedUser', testInstance.authedUser)

      expect(instances[0]).toHaveProperty('_id')
      expect(instances[0]).toHaveProperty('channel', null)
      expect(instances[0]).toHaveProperty('manualAnnouncement')
      expect(instances[0]).toHaveProperty('weekdays')
      expect(instances[0]).toHaveProperty('intervalStart')
      expect(instances[0]).toHaveProperty('intervalEnd')
      expect(instances[0]).toHaveProperty('timezone')
      expect(instances[0]).toHaveProperty('buttons.version', 1)
      expect(instances[0]).toHaveProperty('scheduled', {})
    })

    test('returns an instance with enough information for onboarding purposes', async () => {
      // enough is currently: accessToken, and userId of authed user.
      const testInstance = new Instance()

      const result = await db.installInstance({
        accessToken: testInstance.accessToken,
        scope: testInstance.scope,
        botUserId: testInstance.botUserId,
        appId: testInstance.appId,
        team: testInstance.team,
        authedUser: testInstance.authedUser
      })

      expect(result.accessToken).toEqual(testInstance.accessToken)
      expect(result.authedUser.id).toEqual(testInstance.authedUser.id)
    })
  })

  describe('instancesWithNoScheduledAnnounces', () => {
    test('never returns instances with null channel', async () => {

    })

    test('returns instances where the scheduled time has passed', async () => {

    })

    test('does not return instance where scheduled time has not passed', async () => {

    })
  })
})
