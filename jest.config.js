module.exports = {
  setupFilesAfterEnv: ['jest-extended/all']
}

process.env = Object.assign(process.env, {
  MONGOMS_VERSION: 'v6.0-latest'
})
