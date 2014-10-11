#!/usr/bin/env node

var minimist = require('minimist')
var ss = require('../')

var argv = minimist(process.argv.slice(2), {
  boolean: 'close',
  alias: { t: 'timeout' }
})

var browser = ss()

process.stdin.on('end', function() {
  var timeout = parseInt(argv['timeout'], 10)
  if (argv['close']) timeout = 1

  if (timeout) {
    browser.write(
      'setTimeout(function() {window.close()}, '+timeout+')'
    )
  }
  browser.end()
})

process.stdin
.pipe(browser, {end: false})
.pipe(process.stdout)

browser.on('close', function() {
  process.exit()
})
