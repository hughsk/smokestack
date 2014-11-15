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
