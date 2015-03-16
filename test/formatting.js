"use strict"

var test = require("tape")
var bl = require('bl')
var ss = require('../')

test('will format log messages appropriately', function(t) {
  var browser = ss({ browser: process.env.browser, saucelabs: !!process.env.sauce })
  browser.pipe(bl(function(err, data) {
    if (err) return t.end(err)
    t.ok(data, 'data exists')
    data = String(data)
    t.deepEqual(data, "The formatted message is: 'hello world'.\n")
    t.end()
  }))
  browser.write('console.log("The formatted message is: \'%s\'.", "hello world")\n')
  browser.write('window.close()')
  browser.end()
})
