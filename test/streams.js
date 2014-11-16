"use strict"

var test = require("tape")
var bl = require('bl')
var ss = require('../')

test('can pipe data in and get stderr and stdout', function(t) {
  var browser = ss({ browser: process.env.browser, saucelabs: !!process.env.sauce })
  browser.pipe(bl(function(err, data) {
    t.deepEqual(data.toString().trim().split('\n'), [
      'log',
      'info',
      'warn',
      'error',
    ])
    t.end()
  }))
  browser.write('console.log("log")\n')
  browser.write('console.info("info")\n')
  browser.write('console.warn("warn")\n')
  browser.write('console.error("error")\n')
  browser.write('window.close()')
  browser.end()
})
