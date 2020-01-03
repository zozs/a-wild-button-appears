module.exports = {
  async signingSecret (team) {
    return `SIGNINGSECRET_${team}`
  }
}
