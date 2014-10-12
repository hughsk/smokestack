"use strict"

var test = require("tape")
var bl = require('bl')
var ss = require('../')

test('can log html elements', function(t) {
  var browser = ss()
  browser.pipe(bl(function(err, data) {
    data = data.toString().trim()
    t.equal(data, '[object HTMLBodyElement]')
    t.end()
  }))
  browser.write(';console.log(document.body);\n')
  browser.write(';window.close();')
  browser.end()
})

test('can log document', function(t) {
  // document contains circular references
  // and doesn't json.stringify, even with
  // isaacs/json-stringify-safe.
  // Test may seem redundant but any future adjustment to
  // logging of DOM Elements will need to take document
  // into account.
  var browser = ss()
  browser.pipe(bl(function(err, data) {
    data = data.toString().trim()
    t.equal(data, '[object HTMLDocument]')
    t.end()
  }))
  browser.write(';console.log(document);\n')
  browser.write(';window.close();')
  browser.end()
})
