/* global beforeEach, jest, describe, expect, test */

const settings = require('./settings')

const db = require('./db')

jest.mock('./db')

describe('end time', () => {
  beforeEach(() => {
    db.setEndTime.mockReset()
  })

  test('can set 16:30 correctly', async () => {
    const instanceRef = 'T1234'
    const action = { // the real object has the complete plain text and stuff for the whole view too.
      type: 'static_select',
      action_id: 'admin_endtime',
      selected_option: {
        text: {
          type: 'plain_text',
          text: '16:30',
          emoji: true
        },
        value: 'end-59400'
      }
    }
    const res = { send: jest.fn() }
    await settings.setEndTime(res, instanceRef, action)
    expect(db.setEndTime).toHaveBeenCalledTimes(1)
    expect(db.setEndTime.mock.calls[0][0]).toBe(instanceRef)
    expect(db.setEndTime.mock.calls[0][1]).toBe(59400)
    expect(res.send).toHaveBeenCalledAfter(db.setEndTime)
  })
})

describe('start time', () => {
  beforeEach(() => {
    db.setStartTime.mockReset()
  })

  test('can set 00:30 correctly', async () => {
    const instanceRef = 'T1234'
    const action = { // the real object has the complete plain text and stuff for the whole view too.
      type: 'static_select',
      action_id: 'admin_starttime',
      selected_option: {
        text: {
          type: 'plain_text',
          text: '00:30',
          emoji: true
        },
        value: 'start-1800'
      }
    }
    const res = { send: jest.fn() }

    await settings.setStartTime(res, instanceRef, action)
    expect(db.setStartTime).toHaveBeenCalledTimes(1)
    expect(db.setStartTime.mock.calls[0][0]).toBe(instanceRef)
    expect(db.setStartTime.mock.calls[0][1]).toBe(1800)
    expect(res.send).toHaveBeenCalledAfter(db.setStartTime)
  })

  test('can set 09:00 correctly', async () => {
    const instanceRef = 'T1234'
    const action = { // the real object has the complete plain text and stuff for the whole view too.
      type: 'static_select',
      action_id: 'admin_starttime',
      selected_option: {
        text: {
          type: 'plain_text',
          text: '09:00',
          emoji: true
        },
        value: 'start-32400'
      }
    }
    const res = { send: jest.fn() }

    await settings.setStartTime(res, instanceRef, action)
    expect(db.setStartTime).toHaveBeenCalledTimes(1)
    expect(db.setStartTime.mock.calls[0][0]).toBe(instanceRef)
    expect(db.setStartTime.mock.calls[0][1]).toBe(32400)
    expect(res.send).toHaveBeenCalledAfter(db.setStartTime)
  })
})

describe('timezone setting', () => {
  beforeEach(() => {
    db.setTimezone.mockReset()
  })

  test('can set Copenhagen correctly', async () => {
    const instanceRef = 'T1234'
    const action = { // the real object has the complete plain text and stuff for the whole view too.
      type: 'static_select',
      action_id: 'admin_weekdays',
      selected_option: {
        text: {
          type: 'plain_text',
          text: 'Europe/Copenhagen',
          emoji: true
        },
        value: 'timezone-Europe/Copenhagen'
      }
    }
    const res = { send: jest.fn() }

    await settings.setTimezone(res, instanceRef, action)
    expect(db.setTimezone).toHaveBeenCalledTimes(1)
    expect(db.setTimezone.mock.calls[0][0]).toBe(instanceRef)
    expect(db.setTimezone.mock.calls[0][1]).toBe('Europe/Copenhagen')
    expect(res.send).toHaveBeenCalledAfter(db.setTimezone)
  })
})

describe('weekday setting', () => {
  beforeEach(() => {
    db.setWeekdays.mockReset()
  })

  test('can set all days correctly', async () => {
    const instanceRef = 'T1234'
    const action = { // the real object has the complete plain text and stuff for the whole view too.
      type: 'multi_static_select',
      action_id: 'admin_weekdays',
      selected_options: [
        { value: 'weekday-1' },
        { value: 'weekday-2' },
        { value: 'weekday-3' },
        { value: 'weekday-4' },
        { value: 'weekday-5' },
        { value: 'weekday-6' },
        { value: 'weekday-7' }
      ]
    }
    const res = { send: jest.fn() }

    await settings.setWeekdays(res, instanceRef, action)
    expect(db.setWeekdays).toHaveBeenCalledTimes(1)
    expect(db.setWeekdays.mock.calls[0][0]).toBe(instanceRef)
    expect(db.setWeekdays.mock.calls[0][1]).toBe(0b1111111)
    expect(res.send).toHaveBeenCalledAfter(db.setWeekdays)
  })

  test('can set some days correctly', async () => {
    const instanceRef = 'T1234'
    const action = { // the real object has the complete plain text and stuff for the whole view too.
      type: 'multi_static_select',
      action_id: 'admin_weekdays',
      selected_options: [
        { value: 'weekday-1' },
        { value: 'weekday-2' },
        { value: 'weekday-3' },
        { value: 'weekday-4' },
        { value: 'weekday-5' }
      ]
    }
    const res = { send: jest.fn() }

    await settings.setWeekdays(res, instanceRef, action)
    expect(db.setWeekdays).toHaveBeenCalledTimes(1)
    expect(db.setWeekdays.mock.calls[0][0]).toBe(instanceRef)
    expect(db.setWeekdays.mock.calls[0][1]).toBe(0b1111100)
    expect(res.send).toHaveBeenCalledAfter(db.setWeekdays)
  })

  test('can set no days correctly', async () => {
    const instanceRef = 'T1234'
    const action = { // the real object has the complete plain text and stuff for the whole view too.
      type: 'multi_static_select',
      action_id: 'admin_weekdays',
      selected_options: []
    }
    const res = { send: jest.fn() }

    await settings.setWeekdays(res, instanceRef, action)
    expect(db.setWeekdays).toHaveBeenCalledTimes(1)
    expect(db.setWeekdays.mock.calls[0][0]).toBe(instanceRef)
    expect(db.setWeekdays.mock.calls[0][1]).toBe(0b0000000)
    expect(res.send).toHaveBeenCalledAfter(db.setWeekdays)
  })
})
