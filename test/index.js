process.env.browser = process.env.browser || 'chrome'

if (process.env.browser === 'chrome') {
  require('./capture')
}

if (process.env.browser !== 'saucelabs') {
  require('./cleanup')
}

require('./closing')
require('./errors')
require('./events')
require('./formatting')
require('./logging')
require('./stdin')
require('./streams')
