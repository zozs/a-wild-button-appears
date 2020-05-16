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
console.debug = jest.fn()

const db = require('./db')
const { Instance } = require('./instance')

jest.mock('./instance')

describe('database', () => {
  beforeEach(async () => {
    const collection = await db._instanceCollection()
    await collection.deleteMany({})
  })

  describe('clickData', () => {
    beforeEach(async () => {
      const collection = await db._instanceCollection()
      await collection.deleteMany({})

      // For each of these tests, initialize the db with some contents.
      const instance = {
        accessToken: 'xoxop-134234234',
        team: {
          id: 'T1',
          name: 'Team1'
        },
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
        channel: 'C1',
        scheduled: {},
        buttons: [
          {
            uuid: '2020-03-14T13:37:00.000Z',
            clicks: [
              {
                user: 'U12341234',
                timestamp: '2020-03-14T13:37:02.000Z'
              },
              {
                user: 'U99991111',
                timestamp: '2020-03-14T13:37:03.000Z'
              }
            ]
          },
          {
            uuid: '2020-03-15T13:37:00.000Z'
          }
        ]
      }

      await collection.insertMany([instance])
    })

    test('returns clicks in the usual case', async () => {
      const { clicks } = await db.clickData('T1', '2020-03-14T13:37:00.000Z')
      expect(clicks).toEqual([
        {
          user: 'U12341234',
          timestamp: '2020-03-14T13:37:02.000Z'
        },
        {
          user: 'U99991111',
          timestamp: '2020-03-14T13:37:03.000Z'
        }
      ])
    })

    test('returns empty when uuid does not have clicks array', async () => {
      const { clicks } = await db.clickData('T1', '2020-03-15T13:37:00.000Z')
      expect(clicks).toEqual([])
    })

    test('returns empty when uuid does not exist', async () => {
      const { clicks } = await db.clickData('T1', '2020-03-16T13:37:00.000Z')
      expect(clicks).toEqual([])
    })
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
      expect(instances[0]).toHaveProperty('manualAnnounce')
      expect(instances[0]).toHaveProperty('weekdays')
      expect(instances[0]).toHaveProperty('intervalStart')
      expect(instances[0]).toHaveProperty('intervalEnd')
      expect(instances[0]).toHaveProperty('timezone')
      expect(instances[0]).toHaveProperty('buttonsVersion', 1)
      expect(instances[0]).toHaveProperty('buttons', [])
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

  describe('instance', () => {
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
        buttons: []
      }

      await collection.insertMany([{
        ...sharedProperties,
        team: {
          id: 'T1',
          name: 'Team1'
        },
        channel: null,
        scheduled: {}
      }])
    })

    test('returns undefined for non-existent instanceRef', async () => {
      const instance = await db.instance('T404')
      expect(instance).toBe(null)
    })

    test('return an object with some contents for existing instance', async () => {
      const instance = await db.instance('T1')
      expect(instance).not.toBe(null)
      expect(instance).toHaveProperty('accessToken', 'xoxop-134234234')
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
        buttons: []
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
        channel: 'C1',
        intervalStart: 32400,
        intervalEnd: 57600,
        timezone: 'Europe/Copenhagen',
        scope: 'chat:write',
        botUserId: 'U8',
        appId: 'A1',
        authedUser: {
          id: 'U9'
        }
      }

      await collection.insertMany([{ // no scheduled time, but buttons.
        ...sharedProperties,
        team: {
          id: 'T1',
          name: 'Team1'
        },
        scheduled: {},
        buttons: [
          {
            uuid: '2020-04-06T14:39:37.123Z',
            clicks: [{
              user: 'U1',
              timestamp: DateTime.local().toJSDate()
            }]
          },
          {
            uuid: '2020-04-04T18:39:37.123Z',
            clicks: [{
              user: 'U1',
              timestamp: DateTime.local().toJSDate()
            }]
          }
        ]
      }, { // scheduled time after all buttons.
        ...sharedProperties,
        team: {
          id: 'T2',
          name: 'Team2'
        },
        scheduled: {
          timestamp: DateTime.fromISO('2020-05-25T00:00:00.000Z').toUTC().toBSON(),
          messageId: ''
        },
        buttons: [
          {
            uuid: '2020-04-04T18:39:37.123Z',
            clicks: [{
              user: 'U1',
              timestamp: DateTime.local().toJSDate()
            }]
          },
          {
            uuid: '2020-05-24T14:39:37.123Z',
            clicks: [{
              user: 'U1',
              timestamp: DateTime.local().toJSDate()
            }]
          }
        ]
      }, { // scheduled time, no buttons.
        ...sharedProperties,
        team: {
          id: 'T3',
          name: 'Team3'
        },
        scheduled: {
          timestamp: DateTime.fromISO('2020-05-25T00:00:00.000Z').toUTC().toBSON(),
          messageId: ''
        },
        buttons: []
      }, { // no scheduled time, no buttons.
        ...sharedProperties,
        team: {
          id: 'T4',
          name: 'Team4'
        },
        scheduled: {},
        buttonsVersion: 1,
        buttons: []
      }])
    })

    test('no scheduled time, but buttons', async () => {
      const announce = await db.lastAnnounce('T1', DateTime.local())
      expect(+announce).toEqual(+DateTime.fromISO('2020-04-06T14:39:37.123Z'))
    })

    test('scheduled time after all buttons, current time after scheduled', async () => {
      const announce = await db.lastAnnounce('T2', DateTime.fromISO('2020-05-25T02:01:03.000+02:00'))
      expect(+announce).toEqual(+DateTime.fromISO('2020-05-25T00:00:00.000Z'))
    })

    test('scheduled time after all buttons, current time before scheduled.', async () => {
      const announce = await db.lastAnnounce('T2', DateTime.fromISO('2020-05-24T21:00:00.000Z'))
      expect(+announce).toEqual(+DateTime.fromISO('2020-05-24T14:39:37.123Z'))
    })

    test('no scheduled time, no buttons', async () => {
      const announce = await db.lastAnnounce('T4', DateTime.local())
      expect(announce).toEqual(null)
    })

    test('scheduled time, no buttons, current time before scheduled', async () => {
      const announce = await db.lastAnnounce('T3', DateTime.fromISO('2020-05-24T21:00:00.000Z'))
      expect(announce).toEqual(null)
    })

    test('scheduled time, no buttons, current time after scheduled', async () => {
      const announce = await db.lastAnnounce('T3', DateTime.fromISO('2020-05-25T02:01:03.000+02:00'))
      expect(+announce).toEqual(+DateTime.fromISO('2020-05-25T00:00:00.000Z'))
    })
  })

  describe('recordClick', () => {
    beforeEach(async () => {
      // add example instance.
      const collection = await db._instanceCollection()
      await collection.deleteMany({})

      await collection.insertMany([{
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
        buttonsVersion: 1,
        buttons: []
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
      expect(instance.buttonsVersion).toEqual(2)
      expect(instance.buttons).toEqual([{
        uuid: '2020-04-04T18:39:37.123Z',
        clicks: [{
          user: 'U1337',
          timestamp: time.toJSDate()
        }]
      }])
    })

    test('uuid does exist, but no clicks array', async () => {
      const instanceRef = 'T1'
      const uuid = '2020-04-04T18:39:37.123Z'

      const collection = await db._instanceCollection()
      await collection.updateOne({ 'team.id': instanceRef }, {
        $set: {
          buttons: [{
            uuid
          }]
        }
      })

      const user = 'U1337'
      const time = DateTime.local()
      const first = await db.recordClick(instanceRef, uuid, user, time)

      expect(first).toEqual(true)

      const instance = await collection.findOne({
        'team.id': instanceRef
      })
      expect(instance).not.toEqual(undefined)
      expect(instance.buttons).not.toEqual(undefined)
      expect(instance.buttonsVersion).toEqual(2)
      expect(instance.buttons).toEqual([{
        uuid: '2020-04-04T18:39:37.123Z',
        clicks: [{
          user: 'U1337',
          timestamp: time.toJSDate()
        }]
      }])
    })

    test('uuid does exist, but empty clicks array', async () => {
      const instanceRef = 'T1'
      const uuid = '2020-04-04T18:39:37.123Z'

      const collection = await db._instanceCollection()
      await collection.updateOne({ 'team.id': instanceRef }, {
        $set: {
          buttons: [{
            clicks: [],
            uuid
          }]
        }
      })

      const user = 'U1337'
      const time = DateTime.local()
      const first = await db.recordClick(instanceRef, uuid, user, time)

      expect(first).toEqual(true)

      const instance = await collection.findOne({
        'team.id': instanceRef
      })
      expect(instance).not.toEqual(undefined)
      expect(instance.buttons).not.toEqual(undefined)
      expect(instance.buttonsVersion).toEqual(2)
      expect(instance.buttons).toEqual([{
        uuid: '2020-04-04T18:39:37.123Z',
        clicks: [{
          user: 'U1337',
          timestamp: time.toJSDate()
        }]
      }])
    })

    test('runner up outside range not added, same user', async () => {
      const instanceRef = 'T1'
      const uuid = '2020-04-04T18:39:37.123Z'
      const user = 'U1337'
      const time = DateTime.local()

      const first = await db.recordClick(instanceRef, uuid, user, time)
      const second = await db.recordClick(instanceRef, uuid, user, time.plus(2001)) // too slow
      expect(first).toEqual(true)
      expect(second).toEqual(false)

      const collection = await db._instanceCollection()
      const instance = await collection.findOne({
        'team.id': instanceRef
      })

      expect(instance.buttonsVersion).toEqual(3)
      expect(instance.buttons).toEqual([{
        uuid: '2020-04-04T18:39:37.123Z',
        clicks: [{
          user: 'U1337',
          timestamp: time.toJSDate()
        }]
      }])
    })

    test('duplicate timestamp is not accepted for same user', async () => {
      const instanceRef = 'T1'
      const uuid = '2020-04-04T18:39:37.123Z'
      const user = 'U1337'
      const time = DateTime.local()

      const first = await db.recordClick(instanceRef, uuid, user, time)
      const second = await db.recordClick(instanceRef, uuid, user, time)
      expect(first).toEqual(true)
      expect(second).toEqual(false)

      const collection = await db._instanceCollection()
      const instance = await collection.findOne({
        'team.id': instanceRef
      })

      expect(instance.buttonsVersion).toEqual(3)
      expect(instance.buttons).toEqual([{
        uuid: '2020-04-04T18:39:37.123Z',
        clicks: [{
          user: 'U1337',
          timestamp: time.toJSDate()
        }]
      }])
    })

    test('runner up outside range not added, same user, wrong order', async () => {
      const instanceRef = 'T1'
      const uuid = '2020-04-04T18:39:37.123Z'
      const user = 'U1337'
      const time = DateTime.local()

      const first = await db.recordClick(instanceRef, uuid, user, time.plus(2001)) // too slow
      const second = await db.recordClick(instanceRef, uuid, user, time) // but wont notice until here
      expect(first).toEqual(true)
      expect(second).toEqual(false)

      const collection = await db._instanceCollection()
      const instance = await collection.findOne({
        'team.id': instanceRef
      })

      expect(instance.buttonsVersion).toEqual(3)
      expect(instance.buttons).toEqual([{
        uuid: '2020-04-04T18:39:37.123Z',
        clicks: [{
          user: 'U1337',
          timestamp: time.toJSDate()
        }]
      }])
    })

    test('runner up outside range not added, different user', async () => {
      const instanceRef = 'T1'
      const uuid = '2020-04-04T18:39:37.123Z'
      const user1 = 'U1337'
      const user2 = 'U1338'
      const time = DateTime.local()

      const first = await db.recordClick(instanceRef, uuid, user2, time.plus(2001)) // too slow
      const second = await db.recordClick(instanceRef, uuid, user1, time) // but wont notice until here.
      expect(first).toEqual(true)
      expect(second).toEqual(false)

      const collection = await db._instanceCollection()
      const instance = await collection.findOne({
        'team.id': instanceRef
      })

      expect(instance.buttonsVersion).toEqual(3) // will still write.
      expect(instance.buttons).toEqual([{
        uuid: '2020-04-04T18:39:37.123Z',
        clicks: [{
          user: 'U1337',
          timestamp: time.toJSDate()
        }]
      }])
    })

    test('different users are all added and sorted', async () => {
      const instanceRef = 'T1'
      const uuid = '2020-04-04T18:39:37.123Z'
      const time = DateTime.local()
      const newClicks = [
        {
          user: 'U12',
          time: time.plus(1000)
        },
        {
          user: 'U10',
          time
        },
        {
          user: 'U11',
          time: time.plus(100)
        }
      ]

      const first = await db.recordClick(instanceRef, uuid, newClicks[0].user, newClicks[0].time)
      const second = await db.recordClick(instanceRef, uuid, newClicks[1].user, newClicks[1].time)
      const third = await db.recordClick(instanceRef, uuid, newClicks[2].user, newClicks[2].time)

      expect(first).toEqual(true)
      expect(second).toEqual(false)
      expect(third).toEqual(false)

      const collection = await db._instanceCollection()
      const instance = await collection.findOne({
        'team.id': instanceRef
      })
      expect(instance).not.toEqual(undefined)
      expect(instance.buttons).not.toEqual(undefined)
      expect(instance.buttonsVersion).toEqual(4)
      expect(instance.buttons).toEqual([{
        uuid: '2020-04-04T18:39:37.123Z',
        clicks: [
          {
            user: 'U10',
            timestamp: newClicks[1].time.toJSDate()
          },
          {
            user: 'U11',
            timestamp: newClicks[2].time.toJSDate()
          },
          {
            user: 'U12',
            timestamp: newClicks[0].time.toJSDate()
          }
        ]
      }])
    })

    test('two different buttons works', async () => {
      // this should both mean that the return value is true since we're first, and
      // that the new uuid together with the timestamp info is added to db.
      const instanceRef = 'T1'
      const uuid1 = '2020-04-04T18:39:37.123Z'
      const uuid2 = '2020-04-11T19:15:45.641Z'
      const user = 'U1337'
      const time = DateTime.local()
      const first = await db.recordClick(instanceRef, uuid1, user, time)
      const second = await db.recordClick(instanceRef, uuid2, user, time)

      expect(first).toEqual(true)
      expect(second).toEqual(true)

      const collection = await db._instanceCollection()
      const instance = await collection.findOne({
        'team.id': instanceRef
      })
      expect(instance).not.toEqual(undefined)
      expect(instance.buttons).not.toEqual(undefined)
      expect(instance.buttonsVersion).toEqual(3)
      expect(instance.buttons).toEqual([
        {
          uuid: uuid1,
          clicks: [{
            user,
            timestamp: time.toJSDate()
          }]
        },
        {
          uuid: uuid2,
          clicks: [{
            user,
            timestamp: time.toJSDate()
          }]
        }
      ])
    })

    test('that optimistic concurrency control works for same button', async () => {
      const instanceRef = 'T1'
      const uuid = '2020-04-04T18:39:37.123Z'
      const user1 = 'U100'
      const user2 = 'U200'
      const time = DateTime.local()

      let callbackExecuted = false
      let second
      const first = await db.recordClick(instanceRef, uuid, user1, time, async () => {
        if (!callbackExecuted) {
          second = await db.recordClick(instanceRef, uuid, user2, time.plus(100))
        }
        callbackExecuted = true
      })
      expect(first).toEqual(false)
      expect(second).toEqual(true)

      const collection = await db._instanceCollection()
      const instance = await collection.findOne({
        'team.id': instanceRef
      })

      expect(instance.buttonsVersion).toEqual(3)
      expect(instance.buttons).toEqual([{
        uuid: '2020-04-04T18:39:37.123Z',
        clicks: [
          {
            user: 'U100',
            timestamp: time.toJSDate()
          },
          {
            user: 'U200',
            timestamp: (time.plus(100)).toJSDate()
          }
        ]
      }])
    })
  })

  describe('storeScheduled', () => {
    beforeEach(async () => {
      // add example instance.
      const collection = await db._instanceCollection()
      await collection.deleteMany({})

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
        channel: null,
        buttonsVersion: 1,
        buttons: []
      }

      await collection.insertMany([{
        ...sharedProperties,
        team: {
          id: 'T1',
          name: 'Team1'
        },
        scheduled: {}
      }, {
        ...sharedProperties,
        team: {
          id: 'T2',
          name: 'Team2'
        },
        scheduled: {
          timestamp: DateTime.fromISO('2020-04-12T13:22:00.000Z').toUTC().toBSON(),
          messageId: 'before'
        }
      }])
    })

    test('update existing schedule', async () => {
      const messageId = 'after'
      const timestamp = DateTime.local()
      await db.storeScheduled('T2', timestamp, messageId)

      const collection = await db._instanceCollection()
      const instance = await collection.findOne({
        'team.id': 'T2'
      })

      expect(instance.scheduled).toEqual({
        timestamp: timestamp.toJSDate(),
        messageId
      })
    })

    test('set new schedule', async () => {
      const messageId = 'after'
      const timestamp = DateTime.local()
      await db.storeScheduled('T1', timestamp, messageId)

      const collection = await db._instanceCollection()
      const instance = await collection.findOne({
        'team.id': 'T1'
      })

      expect(instance.scheduled).toEqual({
        timestamp: timestamp.toJSDate(),
        messageId
      })
    })
  })
})
