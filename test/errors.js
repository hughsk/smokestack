"use strict"

var test = require("tape")
var bl = require('bl')
var ss = require('../')

var browserKind = process.env.browser

test(browserKind + ' will report errors', function(t) {
  var browser = ss({ browser: browserKind, saucelabs: !!process.env.saucelabs })
  var stack = /https?:\/\/.*\/script\.js/g
  var line = /script\.js:2:\d/g
  var context = /Math\.random/g

  var buffer = bl(function(err, data) {
    data = String(data)
    t.ok(/badness happened/gm.test(data), 'contains error message')
    t.ok(line.test(data), 'contains line number')
    t.ok(stack.test(data), 'contains something that looks like a trace')
    t.ok(context.test(data), 'contains something that looks like execution context')
    t.end()
  })

  browser.pipe(buffer)
  browser.write('Math.random();\nthrow new Error("badness happened")\n')
  browser.end()
})
