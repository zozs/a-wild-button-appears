const fs = require('fs')
const { promisify } = require('util')

const dataFilename = process.env.DATA

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

async function saveJSON (dataObj) {
  let jsonData = JSON.stringify(dataObj)
  await promisify(fs.writeFile)(dataFilename, jsonData, 'utf8')
}

// Parse the data once on startup, then save when changes are made.
let data = parseJSON()

module.exports = {
  isClicked: (uuid) => data.clicks.hasOwnProperty(uuid),
  setClicked: async (uuid, user) => {
    data.clicks[uuid] = user
    await saveJSON(data)
  }
}
