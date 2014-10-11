#!/usr/bin/env node

var minimist = require('minimist')
var finished = require('tap-finished');
var through = require('through2')
var ss = require('../')

var argv = minimist(process.argv.slice(2), {
  boolean: 'close',
  alias: { t: 'timeout' }
})

var browser = ss()

var timeout = parseInt(argv['timeout'], 10)
if (argv['close'] && !timeout) timeout = 1

if (timeout) setupTimeout(browser, timeout)

process.stdin.on('end', function() {
  browser.end()
})

var pipeline = process.stdin
.pipe(browser, {end: false})

// TODO figure out a better way to handle closing the browser when tap
// output is done. Probably doesn't belong in here.
if (argv['tap']) {
  pipeline.on('end', function() {
    tapStream.end()
  })

  var tapStream = finished(function(result) {
    browser.shutdown(function() {
      console.log("result.ok ? 0 : 1", result.ok ? 0 : 1)
      process.exit(result.ok ? 0 : 1)
    })
  })

  pipeline = pipeline.pipe(through(function(data, enc, cb) {
    tapStream.write(data)
    this.push(data)
    cb()
  }))
}

pipeline.pipe(process.stdout)

function setupTimeout(browser, timeout) {
  browser.write(
    ';setTimeout(function() {window.close()}, '+timeout+');\n'
  )
  browser.once('spawn', function(child) {
    var kill = setTimeout(function() {
      child.kill('SIGTERM')
    }, timeout * 2)
    kill.unref()
    browser.once('connect', function() {
      clearTimeout(kill) // reset kill timeout if we connect
      setTimeout(function() {
        child.kill('SIGTERM')
      }, timeout * 2).unref()
    })
  })
}
