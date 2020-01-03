const wildbuttonApp = require('./wildbutton')

wildbuttonApp.listen(process.env.PORT, () => console.log('A wild BUTTON appeared (standalone) listening on port', process.env.PORT))
