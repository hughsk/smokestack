"use strict"

var test = require("tape")
var fs = require('fs')
var os = require('os')

var ss = require('../')

test('will clean up tmpdir', function(t) {
  var tmpContentBefore = getSmokestackTmp()

  var browser = ss({ browser: process.env.browser, saucelabs: !!process.env.sauce })
  browser.write('window.close()')
  browser.on('shutdown', function() {
    var tmpContentAfter = getSmokestackTmp()
    t.deepEqual(tmpContentBefore, tmpContentAfter)
    t.end()
  })

  browser.end()
})

test('will clean up tmpdir again', function(t) {
  // test weird interplay when running multiple tests
  var tmpContentBefore = getSmokestackTmp()

  var browser = ss({ browser: process.env.browser, saucelabs: !!process.env.sauce })
  browser.write('window.close()')
  browser.end()
  browser.on('shutdown', function() {
    var tmpContentAfter = getSmokestackTmp()
    t.deepEqual(tmpContentBefore, tmpContentAfter)
    t.end()
  })
})


test('will clean up tmpdir if exit prematurely', function(t) {
  var tmpContentBefore = getSmokestackTmp()

  var browser = ss({ browser: process.env.browser, saucelabs: !!process.env.sauce })
  browser.end()
  browser.on('spawn', function(child) {
    setTimeout(function() {
      child.kill()
    }, 500)
  })
  browser.on('shutdown', function() {
    var tmpContentAfter = getSmokestackTmp()
    t.deepEqual(tmpContentBefore, tmpContentAfter)
    t.end()
  })
})

function getSmokestackTmp() {
  return fs.readdirSync(os.tmpdir())
  .filter(function(item) {
    return /^smokestack/.test(item) // item starts with 'smokestack'
  })
}
