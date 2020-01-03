const admin = require('firebase-admin')

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: process.env.FIREBASE_CRED_TYPE,
      project_id: process.env.FIREBASE_CRED_PROJECT_ID,
      private_key_id: process.env.FIREBASE_CRED_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_CRED_PRIVATE_KEY,
      client_email: process.env.FIREBASE_CRED_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CRED_CLIENT_ID,
      auth_uri: process.env.FIREBASE_CRED_AUTH_URI,
      token_uri: process.env.FIREBASE_CRED_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_CRED_AUTH_PROVIDER,
      client_x509_cert_url: process.env.FIREBASE_CRED_X509
    }),
    databaseURL: process.env.FIREBASE_DATABASEURL
  })
}

const firestore = admin.firestore()

async function signingSecret (team) {
  /*
  const { rows } = await pool.query('SELECT signing_secret FROM instances WHERE team = $1', [team])
  if (rows[0] === undefined) {
    throw new Error('No such team in database!')
  }
  return rows[0].signing_secret
  */
}

module.exports = {
  signingSecret
}
