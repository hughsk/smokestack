"use strict"

var test = require("tape")
var bl = require('bl')
var fs = require('fs')
var ss = require('../')
var browserify = require('browserify')

// chrome is the default
var browserKind = process.env.browser || 'chrome'

test(browserKind + ' will report errors', function(t) {
  var browser = ss({ browser: browserKind, saucelabs: !!process.env.saucelabs })
  var stack = /https?:\/\/.*\/script\.js/g
  var line = /script\.js:2:\d/g
  var context = /throw new Error/g

  var buffer = bl(function(err, data) {
    data = String(data)
    t.ok(/badness happened/gm.test(data), 'contains error message')
    t.ok(line.test(data), 'contains line number')
    t.ok(stack.test(data), 'contains something that looks like a trace')
    t.ok(context.test(data), 'contains something that looks like execution context')
    t.end()
  })

  browser.pipe(buffer)
  fs.createReadStream(__dirname + '/fixtures/throw-client.js')
  .pipe(browser)
})

test(browserKind + ' will report errors with sourcemap support', function(t) {
  var browser = ss({ browser: browserKind, saucelabs: !!process.env.saucelabs })
  var stack = /browser-pack\/_prelude\.js/g
  var line = /fixtures\/throw-client\.js:2/g
  var context = /throw new Error/g

  var buffer = bl(function(err, data) {
    data = String(data)
    t.ok(/badness happened/gm.test(data), 'contains error message')
    // this will start working in a new firefox ~39
    if (browserKind !== 'firefox') {
      t.ok(line.test(data), 'contains source-mapped line number')
      t.ok(stack.test(data), 'contains something that looks like a trace')
    }
    t.ok(context.test(data), 'contains something that looks like execution context')
    t.end()
  })

  browser.pipe(buffer)
  browserify(__dirname + '/fixtures/throw-client.js', {debug: true})
  .bundle().pipe(browser)
})
