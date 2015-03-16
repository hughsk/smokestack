"use strict"

var test = require("tape")
var bl = require('bl')
var ss = require('../')
var spawn = require('child_process').spawn
var path = require('path')

var pkg = require('../package.json')
var bin = path.resolve(__dirname, '..', pkg.bin[pkg.name])

test('can pipe data in and get stdout and stderr', function(t) {
  var browser = spawn(bin, ['-b', process.env.browser])
  browser.stderr.pipe(process.stderr)
  browser.on('error', function() {
    t.fail('Exit with error!', arguments)
  })
  browser.stdout.pipe(bl(function(err, data) {
    if (err) return t.end(err)
    t.ok(data, 'data exists')
    data = String(data).trim()
    t.deepEqual(data.split('\n'), [
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
