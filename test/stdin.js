"use strict"

var test = require("tape")
var bl = require('bl')
var ss = require('../')
var spawn = require('child_process').spawn
var path = require('path')

var pkg = require('../package.json')
var bin = path.resolve(__dirname, '..', pkg.bin[pkg.name])

test('can pipe data in and get stdout and stderr', function(t) {
  var browser = spawn(bin)
  browser.stderr.pipe(process.stderr)
  browser.on('error', function() {
    t.fail('Exit with error!', arguments)
  })
  browser.stdout.pipe(bl(function(err, data) {
    t.deepEqual(data.toString().trim().split('\n'), [
      'log',
      'info',
      'warn',
      'error'
    ])
    t.end()
  }))
  browser.stdin.write('console.log("log")\n')
  browser.stdin.write('console.info("info")\n')
  browser.stdin.write('console.warn("warn")\n')
  browser.stdin.write('console.error("error")\n')
  browser.stdin.write('window.close()\n')
  browser.stdin.end()
})

test('will close automatically with --close', function(t) {
  getCloseTime(function(err, normalCloseTime) {
    t.ifError(err)
    var browser = spawn(bin, ['--close'])
    browser.stderr.pipe(process.stderr)
    browser.on('close', fail)

    // browser should close in <~normalCloseTime if auto-closing.
    setTimeout(function() {
      browser.removeListener('close', fail)
      browser.on('close', function() {
        t.end()
      })
    }, normalCloseTime + normalCloseTime * 0.1)

    browser.stdin.write('setTimeout(function() {window.close()}, '+normalCloseTime+')\n')
    browser.stdin.end()

    function fail() {
      t.fail('Should not auto-close')
      browser.kill()
    }
  })
})

function getCloseTime(fn) {
  var browser = spawn(bin)
  var start = Date.now()
  browser.on('close', function() {
    var end = Date.now()
    return fn(null, end - start)
  })
  browser.stdin.write('window.close()\n')
  browser.stdin.end()
}
