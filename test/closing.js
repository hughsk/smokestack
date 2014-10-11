"use strict"

var test = require("tape")
var bl = require('bl')
var ss = require('../')

var exec = require('child_process').exec
var spawn = require('child_process').spawn
var path = require('path')

var pkg = require('../package.json')
var bin = path.resolve(__dirname, '..', pkg.bin[pkg.name])

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
    }, 2500)
  })
})

test('executable will close automatically with --close', function(t) {
  var browser = spawn(bin, ['--close'])
  browser.on('close', function() {
    t.end()
  })
  browser.stdin.end()
})

test('executable will not close automatically without --close', function(t) {
  getCloseTime(function(err, normalCloseTime) {
    t.ifError(err)
    var browser = spawn(bin)
    browser.stderr.pipe(process.stderr)
    browser.on('close', fail)

    // browser should close in <~normalCloseTime if auto-closing.
    setTimeout(function() {
      browser.removeListener('close', fail)
      browser.on('close', function() {
        t.end()
      })
    }, normalCloseTime)

    browser.stdin.write('setTimeout(function() {window.close()}, '+normalCloseTime+')\n')
    browser.stdin.end()

    function fail() {
      t.fail('Should not auto-close')
      browser.kill()
    }
  })
})

test('executable will close after --timeout time', function(t) {
  getCloseTime(function(err, normalCloseTime) {
    t.ifError(err)
    var browser = spawn(bin, ['--timeout', normalCloseTime])
    browser.stderr.pipe(process.stderr)
    browser.on('close', fail)

    setTimeout(function() {
      browser.removeListener('close', fail)
      browser.on('close', function() {
        t.end()
      })
    }, normalCloseTime)

    browser.stdin.end()

    function fail() {
      t.fail('Should not auto-close')
      browser.kill()
    }
  })
})

function getCloseTime(fn) {
  if (getCloseTime.value) return process.nextTick(function() {
    return fn(null, getCloseTime.value)
  })

  var browser = spawn(bin)
  var start = Date.now()
  browser.on('close', function() {
    var end = Date.now()
    getCloseTime.value = end - start
    return fn(null, getCloseTime.value)
  })
  browser.stdin.write('window.close()\n')
  browser.stdin.end()
}
