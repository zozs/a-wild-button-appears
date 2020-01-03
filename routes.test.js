/* global jest, describe, expect, test */

const request = require('supertest')
const app = require('./wildbutton')

// silence console.debug
console.debug = jest.fn()

jest.mock('./db')
jest.mock('./slack-request-verifier')

function commandRequest (app) {
  return request(app)
    .post('/commands')
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('X-Slack-Signature', 'INVALID')
    .set('X-Slack-Request-Timestamp', Math.floor(Date.now() / 1000))
}

describe('Test the root path', () => {
  test('It should respond.', async () => {
    const response = await request(app).get('/')
    expect(response.statusCode).toBe(200)
    expect(response.text).toMatch(/API is ready/)
  })
})

describe('Test help command', () => {
  test('It should respond.', async () => {
    const response = await commandRequest(app)
      .send({
        text: 'help',
        team_id: 'TESTTEAMID'
      })
    expect(response.statusCode).toBe(200)
    expect(response.text).toMatch(/totally useless/)
  })
})

describe('Test stats command', () => {
  test('It should respond.', async () => {
    const response = await commandRequest(app)
      .send({
        text: 'stats',
        team_id: 'TESTTEAMID'
      })
    expect(response.statusCode).toBe(200)
    expect(response.text).toMatch(/STATISTICS/)
  })
})

describe('Test usage command', () => {
  test('It should respond to usage', async () => {
    const response = await commandRequest(app)
      .send({
        text: 'usage',
        team_id: 'TESTTEAMID'
      })
    expect(response.statusCode).toBe(200)
    expect(response.text).toMatch(/understand you/)
  })

  test('It should respond to any invalid command', async () => {
    const response = await commandRequest(app)
      .send({
        text: 'somethinginvalid',
        team_id: 'TESTTEAMID'
      })
    expect(response.statusCode).toBe(200)
    expect(response.text).toMatch(/understand you/)
  })
})
