#!/usr/bin/env node

/*
 * This script converts an old-style wildstats.json-file to the new SQL-based format.
 * It creates tables if they doesn't exist. It also creates a new instance, with
 * empty tokens, names, channels, and secrets. You need to fill them in manually.
 *
 * Pass the file to parse as an environmental variable.
 *   WILDBUTTON_DATA=wildstats.json
 *
 * Pass database credentials as other environmental variables.
 *   PGHOST=localhost
 *   PGPORT=5432
 *   PGDATABASE=wildbutton
 *   PGUSER=wildbutton
 *   PGPASSWORD=
 */

const fs = require('fs')
const { Pool } = require('pg')

const dataFilename = process.env.WILDBUTTON_DATA

const pool = new Pool()

function parseJSON () {
  try {
    let jsonData = fs.readFileSync(dataFilename, 'utf8')
    return JSON.parse(jsonData)
  } catch (e) {
    return {
      clicks: {}
    }
  }
}

async function convertButton (instanceId, uuid, click) {
  let user
  let winningTime
  if (typeof click === 'string') {
    // Old-style format, only user, no time.
    console.warn(`-- WARNING: ${uuid} with winner ${click} has only user, no winning time.`)
    user = click
    winningTime = null
  } else {
    user = click.user
    winningTime = click.clickTime
  }

  // Add the button itself.
  const { rows } = await pool.query(`INSERT INTO buttons (instance, appeared) VALUES ($1, $2) RETURNING id`,
    [instanceId, uuid])
  const buttonId = rows[0].id

  // Add clicks, first winning click, then runnerUps
  await pool.query('INSERT INTO clicks (button, uid, clicked) VALUES ($1, $2, $3)',
    [buttonId, user, winningTime])
  if (click.runnersUp !== undefined) {
    click.runnersUp.sort((a, b) => (a.clickTime > b.clickTime) - (a.clickTime < b.clickTime))
    for (let runnerUp of click.runnersUp) {
      try {
        await pool.query('INSERT INTO clicks (button, uid, clicked) VALUES ($1, $2, $3)',
          [buttonId, runnerUp.user, runnerUp.clickTime])
      } catch (e) {
        // We may get a constraint violation here if there are multiple clicks by the same user
        // on the button (once upon a time wildbutton didn't filter this). If this is the case
        // simply ignore the slower clicks.
        console.warn(`-- NOTICE: ignoring duplicate user click for button ${uuid}`)
      }
    }
  }
}

async function convertButtons (instanceId, clicks) {
  // For clarity traverse the uuids in sorted order.
  const sortedUuids = Object.keys(clicks).sort()
  for (let key of sortedUuids) {
    await convertButton(instanceId, key, clicks[key])
  }
}

async function convertStats (data) {
  // First create the tables if they don't exist.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS instances (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      token TEXT NOT NULL,
      signing_secret TEXT NOT NULL,
      channel TEXT NOT NULL
    );`)
  await pool.query(`
  CREATE TABLE IF NOT EXISTS buttons (
    id SERIAL PRIMARY KEY,
    instance INTEGER REFERENCES instances,
    appeared TIMESTAMP NOT NULL,
    CONSTRAINT no_same_time UNIQUE (instance, appeared)
  );`)
  await pool.query(`
  CREATE TABLE IF NOT EXISTS clicks (
    id SERIAL PRIMARY KEY,
    button INTEGER REFERENCES buttons,
    uid TEXT NOT NULL,
    clicked TIMESTAMP NULL,
    CONSTRAINT no_click_twice UNIQUE (button, uid)
  );`)

  // Then create the instance.
  const { rows } = await pool.query('INSERT INTO instances (name, token, signing_secret, channel) VALUES ($1, $2, $3, $4) RETURNING id',
    ['', '', '', ''])
  const instanceId = rows[0].id

  // Then convert each button.
  await convertButtons(instanceId, data.clicks)
}

// Parse the data once on startup.
let data = parseJSON()

convertStats(data)
  .catch(e => setImmediate(() => { throw e }))
  .then(() => pool.end())
