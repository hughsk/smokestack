"use strict"

var test = require("tape")
var bl = require('bl')
var ss = require('../')

test('will report errors', function(t) {
  var browser = ss()
  browser.pipe(bl(function(err, data) {
    t.ok(/badness happened/gm.test(data.toString()), 'contains error message')
    t.ok(
      /at http:\/\/localhost/gm.test(data.toString()),
      'contains something that looks like a trace'
    )
    t.end()
  }))
  browser.write('throw new Error("badness happened")\n')
  browser.end()
})
