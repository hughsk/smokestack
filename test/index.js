process.env.browser = process.env.browser || 'chrome'

require('./clean-close')

if (!process.env.sauce) {
  if (process.env.browser === 'chrome') {
    require('./capture')
  }
  require('./cleanup')
  require('./closing')
}

require('./large-files')
require('./errors')
require('./events')
require('./formatting')
require('./logging')
require('./stdin')
require('./streams')
