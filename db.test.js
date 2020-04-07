/* global afterAll, beforeAll, beforeEach, jest, describe, expect, test */

const { DateTime } = require('luxon')
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
//console.debug = jest.fn()

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
    beforeEach(async () => {
      const collection = await db._instanceCollection()
      await collection.deleteMany({})

      // For each of these tests, initialize the db with some contents.
      const sharedProperties = {
        accessToken: 'xoxop-134234234',
        manualAnnounce: false,
        weekdays: 0,
        intervalStart: 32400,
        intervalEnd: 57600,
        timezone: 'Europe/Copenhagen',
        scope: 'chat:write',
        botUserId: 'U8',
        appId: 'A1',
        authedUser: {
          id: 'U9'
        },
        buttons: {}
      }

      await collection.insertMany([{
        ...sharedProperties,
        team: {
          id: 'T1',
          name: 'Team1'
        },
        channel: null,
        scheduled: {
          timestamp: DateTime.fromISO('1999-05-25T00:00:00.000Z').toUTC().toBSON(), // this time has definitively passed.
          messageId: ''
        }
      }, {
        ...sharedProperties,
        team: {
          id: 'T2',
          name: 'Team2'
        },
        channel: 'C2',
        scheduled: {
          timestamp: DateTime.fromISO('1999-05-25T00:00:00.000Z').toUTC().toBSON(), // this time has definitively passed.
          messageId: ''
        }
      }, {
        ...sharedProperties,
        team: {
          id: 'T3',
          name: 'Team3'
        },
        channel: 'C3',
        scheduled: {
          timestamp: DateTime.fromISO('2037-05-25T00:00:00.000Z').toUTC().toBSON(), // this time has definitively passed.
          messageId: ''
        }
      }, {
        ...sharedProperties,
        team: {
          id: 'T4',
          name: 'Team4'
        },
        channel: 'C4',
        scheduled: {} // no scheduled time.
      }])
    })

    test('never returns instances with null channel', async () => {
      const instances = await db.instancesWithNoScheduledAnnounces()
      for (const instance of instances) {
        expect(instance).not.toHaveProperty('channel', null)
      }
    })

    test('returns instances where there is no scheduled time', async () => {
      const instances = await db.instancesWithNoScheduledAnnounces()
      expect(instances).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            team: {
              id: 'T4',
              name: 'Team4'
            },
            channel: 'C4'
          })
        ])
      )
    })

    test('returns instances where the scheduled time has passed', async () => {
      const instances = await db.instancesWithNoScheduledAnnounces()
      expect(instances).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            team: {
              id: 'T2',
              name: 'Team2'
            },
            channel: 'C2'
          })
        ])
      )
    })

    test('does not return instance where scheduled time has not passed', async () => {
      const instances = await db.instancesWithNoScheduledAnnounces()
      expect(instances).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            team: {
              id: 'T3',
              name: 'Team3'
            },
            channel: 'C3'
          })
        ])
      )
    })
  })

  describe('lastAnnounce', () => {
    beforeEach(async () => {
      const collection = await db._instanceCollection()
      await collection.deleteMany({})

      // For each of these tests, initialize the db with some contents.
      const sharedProperties = {
        accessToken: 'xoxop-134234234',
        manualAnnounce: false,
        weekdays: 0,
        intervalStart: 32400,
        intervalEnd: 57600,
        timezone: 'Europe/Copenhagen',
        scope: 'chat:write',
        botUserId: 'U8',
        appId: 'A1',
        authedUser: {
          id: 'U9'
        },
        buttons: {}
      }

      await collection.insertMany([{
        ...sharedProperties,
        team: {
          id: 'T1',
          name: 'Team1'
        },
        channel: null,
        scheduled: {
          timestamp: DateTime.fromISO('1999-05-25T00:00:00.000Z').toUTC().toBSON(), // this time has definitively passed.
          messageId: ''
        }
      }, {
        ...sharedProperties,
        team: {
          id: 'T2',
          name: 'Team2'
        },
        channel: 'C2',
        scheduled: {
          timestamp: DateTime.fromISO('1999-05-25T00:00:00.000Z').toUTC().toBSON(), // this time has definitively passed.
          messageId: ''
        }
      }, {
        ...sharedProperties,
        team: {
          id: 'T4',
          name: 'Team4'
        },
        channel: 'C4',
        scheduled: {} // no scheduled time.
      }])
    })

    test.skip('to be implemented', async () => {

    })
  })

  describe('recordClick', () => {
    beforeEach(async () => {
      // add example instance.
      const collection = await db._instanceCollection()
      await collection.deleteMany({})

      collection.insertMany([{
        accessToken: 'xoxop-134234234',
        manualAnnounce: false,
        weekdays: 0,
        intervalStart: 32400,
        intervalEnd: 57600,
        timezone: 'Europe/Copenhagen',
        scope: 'chat:write',
        botUserId: 'U8',
        appId: 'A1',
        authedUser: {
          id: 'U9'
        },
        team: {
          id: 'T1',
          name: 'Team1'
        },
        channel: null,
        scheduled: {},
        buttons: {
          version: 1
        }
      }])
    })

    test('when uuid does not yet exist', async () => {
      // this should both mean that the return value is true since we're first, and
      // that the new uuid together with the timestamp info is added to db.
      const instanceRef = 'T1'
      const uuid = '2020-04-04T18:39:37.123Z'
      const user = 'U1337'
      const time = DateTime.local()
      const first = await db.recordClick(instanceRef, uuid, user, time)

      expect(first).toEqual(true)

      const collection = await db._instanceCollection()
      const instance = await collection.findOne({
        'team.id': instanceRef
      })
      expect(instance).not.toEqual(undefined)
      expect(instance.buttons).not.toEqual(undefined)
      expect(instance.buttons).toEqual(expect.objectContaining({
        version: 2,
        '2020-04-04T18:39:37.123Z': {
          clicks: [{
            user: 'U1337',
            timestamp: time
          }]
        }
      }))
    })
  })
})
