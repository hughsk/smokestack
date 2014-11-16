"use strict"

var test = require("tape")
var bl = require('bl')
var ss = require('../')

var isSaucelabs = !!process.env.sauce

test('emits some status events', function(t) {
  var browser = ss({ browser: process.env.browser, saucelabs: !!process.env.sauce })

  t.plan(isSaucelabs ? 4 : 6)

  browser.once('listen', function(server) {
    t.ok(server, 'listen emits data')
    t.ok(server.address, 'data is a server')
  })

  browser.once('connect', function(socket) {
    t.ok(socket, 'connect emits data')
    t.equal(socket.prefix, '/smokestack', 'data is a smokestack websocket')
  })

  if (!isSaucelabs) {
    browser.once('spawn', function(child) {
      t.ok(child, 'spawn emits data')
      t.ok(child.pid, 'data is a child process')
    })
  }

  browser.write('window.close()')
  browser.end()
})
