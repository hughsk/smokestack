var ss = require('../../')
var browser = ss({
  browser: process.env.browser, saucelabs: !!process.env.sauce
})
browser.on('spawn', function(child) {
  console.log(child.pid)
})
browser.on('connect', function(child) {
  process.exit()
})
setTimeout(function() {
  throw new Error('Failed to connect!')
}, 5000)
browser.end()
