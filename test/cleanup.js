"use strict"

var test = require("tape")
var fs = require('fs')
var os = require('os')

var ss = require('../')

test('will clean up tmpdir', function(t) {
  var tmpContentBefore = getSmokestackTmp()

  var browser = ss()
  browser.write('window.close()')
  browser.end()
  browser.on('close', function() {
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

