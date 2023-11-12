module.exports = {
  setupFilesAfterEnv: ['jest-extended/all']
}

process.env = Object.assign(process.env, {
  MONGOMS_VERSION: '7.0.2'
})
