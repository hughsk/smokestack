#!/usr/bin/env node

var minimist = require('minimist')
var ss = require('../')

var argv = minimist(process.argv.slice(2), {
  boolean: 'close'
})

var browser = ss()

process.stdin.on('end', function() {
  if (argv['close']) browser.write('window.close()')
  browser.end()
})

process.stdin
.pipe(browser, {end: false})
.pipe(process.stdout)

browser.on('close', function() {
  process.exit()
})
