#!/usr/bin/env node

var minimist = require('minimist')
var ss = require('../')

var argv = minimist(process.argv.slice(2))


var browser = ss()

process.stdin
.pipe(browser)
.pipe(process.stdout)

browser.on('close', function() {
  process.exit()
})
