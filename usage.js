module.exports = async (res) => {
  const usageMessage = {
    text: 'I\'m sorry, but I didn\'t understand you. Use `/wildbutton help` to get help.'
  }
  console.debug('Returning usage instructions.')
  res.send(usageMessage)
  console.debug('Returned usage instructions.')
}
