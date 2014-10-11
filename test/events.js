"use strict"

var test = require("tape")
var bl = require('bl')
var ss = require('../')

test('emits some status events', function(t) {
  var browser = ss()
  browser.write('window.close()')
  browser.end()
  browser.once('spawn', function(child) {
    t.ok(child, 'spawn emits data')
    t.ok(child.pid, 'data is a child process')
    browser.once('connect', function(socket) {
      t.ok(socket, 'connect emits data')
      t.equal(socket.prefix, '/smokestack', 'data is a smokestack websocket')
      t.end()
    })
  })
})
