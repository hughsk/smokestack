"use strict"

var test = require("tape")
var bl = require('bl')
var ss = require('../')

var exec = require('child_process').exec
var spawn = require('child_process').spawn
var path = require('path')

var pkg = require('../package.json')
var bin = path.resolve(__dirname, '..', pkg.bin[pkg.name])

test('browser.shutdown will shut it all down', function(t) {
  t.plan(3)
  var browser = ss({ browser: process.env.browser, saucelabs: !!process.env.sauce })
  var child = undefined
  var server = undefined
  browser.once('spawn', function(spawned) {
    child = spawned
  })
  browser.once('listen', function(listening) {
    server = listening
  })

  browser.once('connect', function() {
    browser.once('shutdown', function() {
      t.ok(child.killed, 'child has been killed')
      t.notOk(server._handle, 'server not listening')
    })
    browser.shutdown(function() {
      t.ok(true)
    })
  })
  browser.end()
})

test('kills process on window.close', function(t) {
  var browser = ss({ browser: process.env.browser, saucelabs: !!process.env.sauce })
  var child = undefined
  browser.once('spawn', function(spawned) {
    child = spawned
  })
  browser.once('connect', function() {
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
  var startup = setTimeout(function() {
    t.fail('Took too long to start!')
    child && child.kill()
    t.end()
  }, 3000)

  var child = exec(process.execPath + ' ' + require.resolve('./fixtures/pid-server'),  function(err, stdout) {
    clearTimeout(startup)
    if (err) return t.fail(err.stack || err.message)
    var pid = parseInt(stdout.trim())
    t.ok(pid, pid + ' should be valid pid')
    setTimeout(function() {
      t.throws(function() {
        process.kill(pid) // should throw cause process is gone
      })
      t.end()
    }, 3000)
  })
})

test('executable will close automatically with --close', function(t) {
  var browser = spawn(bin, ['--close', '-b', process.env.browser])
  browser.once('close', function() {
    t.end()
  })
  browser.stdin.end()
})

test('executable will not close automatically without --close', function(t) {
  getCloseTime(function(err, normalCloseTime) {
    if (err) return t.end(err)
    var browser = spawn(bin, ['-b', process.env.browser])
    browser.stderr.pipe(process.stderr)
    browser.once('close', fail)

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
    if (err) return t.end(err)
    var browser = spawn(bin, ['--timeout', normalCloseTime/2, '-b', process.env.browser])
    browser.stdout.pipe(process.stdout)
    browser.once('close', fail)

    setTimeout(function() {
      browser.removeListener('close', fail)
      browser.on('close', function() {
        t.end()
      })
    }, normalCloseTime - normalCloseTime * 0.2)

    browser.stdin.end()

    function fail() {
      t.fail('Should not auto-close')
      browser.kill()
    }
  })
})

test('executable will close after --timeout time even if browser locked', function(t) {
  getCloseTime(function(err, normalCloseTime) {
    if (err) return t.end(err)
    var browser = spawn(bin, ['--timeout', normalCloseTime/2, '-b', process.env.browser])
    browser.stderr.pipe(process.stderr)
    browser.once('close', function() {
      clearTimeout(tooLong)
      t.end()
    })

    var tooLong = setTimeout(function() {
      t.fail('Did not time out!')
      browser.kill()
    }, normalCloseTime * 4)
    browser.stdin.write('while(true){}')
    browser.stdin.end()
  })
})

function getCloseTime(fn) {
  if (getCloseTime.value) return process.nextTick(function() {
    return fn(null, getCloseTime.value)
  })

  var browser = spawn(bin, ['-b', process.env.browser])
  var start = Date.now()
  browser.once('close', function() {
    var end = Date.now()
    getCloseTime.value = end - start
    return fn(null, getCloseTime.value)
  })
  browser.stdin.write('window.close()\n')
  browser.stdin.end()
}
