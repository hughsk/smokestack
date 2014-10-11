"use strict"

var test = require("tape")
var bl = require('bl')
var ss = require('../')

test('emits some status events', function(t) {
  t.plan(6)
  var browser = ss()

  browser.once('listen', function(server) {
    t.ok(server, 'listen emits data')
    t.ok(server.address, 'data is a server')
  })

  browser.once('spawn', function(child) {
    t.ok(child, 'spawn emits data')
    t.ok(child.pid, 'data is a child process')
  })

  browser.once('connect', function(socket) {
    t.ok(socket, 'connect emits data')
    t.equal(socket.prefix, '/smokestack', 'data is a smokestack websocket')
  })

  browser.write('window.close()')
  browser.end()
})
