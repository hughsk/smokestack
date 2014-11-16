#!/usr/bin/env node

var minimist = require('minimist')
var finished = require('tap-finished');
var through = require('through2')
var path = require('path')
var ss = require('../')
var fs = require('fs')

var argv = minimist(process.argv.slice(2), {
  boolean: 'close',
  alias: {
    s: 'saucelabs',
    t: 'timeout',
    b: 'browser',
    p: 'port',
    h: 'help',
    k: 'key',
    u: 'username'
  }
})

if (argv.help) {
  return fs.createReadStream(path.join(__dirname, 'usage.txt'))
    .once('close', function() { console.error() })
    .pipe(process.stderr)
}

var browser = ss({
  saucelabs: argv.saucelabs,
  sauceUsername: argv.username,
  sauceKey: argv.key,
  browser: argv.browser,
  port: argv.port
})

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
