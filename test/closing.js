"use strict"

var test = require("tape")
var bl = require('bl')
var ss = require('../')

var exec = require('child_process').exec

test('kills process on window.close', function(t) {
  var browser = ss()
  var child = undefined
  browser.on('spawn', function(spawned) {
    child = spawned
  })
  browser.on('connect', function() {
    t.ok(!child.killed, 'child alive')
    browser.on('close', function() {
      t.ok(child.killed, 'child has been killed')
      t.end()
    })
  })
  browser.write('window.close()')
  browser.end()
})

test('close browser if process dies prematurely', function(t) {
  var program = [
    "var ss = require('"+require.resolve('../')+"')",
    "var browser = ss()",
    "browser.on('spawn', function(child) {",
    "  console.log(child.pid)",
    "})",
    "browser.on('connect', function(child) {",
    "  process.exit()",
    "})",
    "browser.end()"
  ].join(';')
  exec('node -e "'+ program +'";', function(err, stdout) {
    t.ifError(err)
    var pid = parseInt(stdout.trim())
    t.ok(pid, pid + ' should be valid pid')
    setTimeout(function() {
      t.throws(function() {
        process.kill(pid) // should throw cause process is gone
      })
      t.end()
    }, 2000)
  })
})

