"use strict"

var test = require("tape")
var bl = require('bl')
var ss = require('../')

var browserKind = process.env.browser

test('will report errors', function(t) {
  var browser = ss({ browser: browserKind, saucelabs: !!process.env.saucelabs })
  var stack = /at https?:\/\/.*\/script\.js/g
  var line = /Line\: \d+/g

  var buffer = bl(function(err, data) {
    data = String(data)

    t.ok(/badness happened/gm.test(data), 'contains error message')
    if (browserKind === 'firefox') {
      t.ok(line.test(data), 'contains line number')
    } else {
      t.ok(stack.test(data), 'contains something that looks like a trace')
    }

    t.end()
  })

  browser.pipe(buffer)
  browser.write('throw new Error("badness happened")\n')
  browser.end()
})
