#!/usr/bin/env node

var minimist = require('minimist')
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

process.stdin
.pipe(browser, {end: false})
.pipe(process.stdout)

browser.on('close', function() {
  process.exit()
})

function setupTimeout(browser, timeout) {
  browser.write(
    'setTimeout(function() {window.close()}, '+timeout+')'
  )
  browser.once('spawn', function(child) {
    var kill = setTimeout(function() {
      child.kill('SIGTERM')
    }, timeout * 2)
    browser.once('connect', function() {
      clearTimeout(kill) // reset kill timeout if we connect
      setTimeout(function() {
        child.kill('SIGTERM')
      }, timeout * 2)
    })
  })
}
