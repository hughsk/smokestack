"use strict"

var test = require("tape")
var bl = require('bl')
var ss = require('../')
var exec = require('child_process').exec

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

test('can log standard datatypes', function(t) {
  var date = Date.now()
  var commands = [
    'var date = ' + date,
    'console.log(new Date(date))',
    'console.log(undefined)',
    'console.log(null)',
    'console.log()',
    'console.log(false)',
    'console.log([])',
    'console.log({})',
    'console.log({hello: {world: true, key: undefined}})',
    'console.log(3)',
    'console.log(\'word\')',
    'console.log(\'\')',
    'console.log(/asda/gm)',
    'console.log(function test() {})'
  ].join(';')

  exec(process.execPath + ' -e "' + commands + '"', function(err, expected) {
    t.ifError(err)
    expected = expected.trim()
    var browser = ss()
    browser.write(commands + ';\n')
    browser.write('window.close()')
    browser.end()
    browser.pipe(bl(function(err, data) {
      data = data.toString().trim()
      t.equal(data, expected)
      t.end()
    }))
  })
})

test('can log standard datatypes printf style', function(t) {
  var date = Date.now()
  var commands = [
    'var date = ' + date,
    'console.log(\'test %s.\', new Date(date))',
    'console.log(\'test %s.\', undefined)',
    'console.log(\'test %s.\', null)',
    'console.log(\'test %s.\')',
    'console.log(\'test %s.\', false)',
    'console.log(\'test %s.\', [])',
    'console.log(\'test %s.\', {})',
    'console.log(\'test %s.\', {hello: {world: true, key: undefined}})',
    'console.log(\'test %s.\', 3)',
    'console.log(\'test %s.\', \'word\')',
    'console.log(\'test %s.\', \'\')',
    'console.log(\'test %s.\', /asda/gm)',
    'console.log(\'test %s.\', function test() {})'
  ].join(';')

  exec(process.execPath + ' -e "' + commands + '"', function(err, expected) {
    t.ifError(err)
    expected = expected.trim()
    var browser = ss()
    browser.write(commands + ';\n')
    browser.write('window.close()')
    browser.end()
    browser.pipe(bl(function(err, data) {
      data = data.toString().trim()
      t.equal(data, expected)
      t.end()
    }))
  })
})
