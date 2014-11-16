"use strict"

var test = require("tape")
var bl = require('bl')
var ss = require('../')
var exec = require('child_process').exec

test('can log html elements', function(t) {
  var browser = ss({ browser: process.env.browser, saucelabs: !!process.env.sauce })
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
  var browser = ss({ browser: process.env.browser, saucelabs: !!process.env.sauce })
  browser.pipe(bl(function(err, data) {
    data = data.toString().trim()
    t.equal(data, '[object HTMLDocument]')
    t.end()
  }))
  browser.write(';console.log(document);\n')
  browser.write(';window.close();')
  browser.end()
})

var date = Date.now()

test('can log standard datatypes', matchesNodeOutput({
  '_init':         'var date = ' + date,
  'date':          'console.log(new Date(date))',
  'undefined':     'console.log(undefined)',
  'null':          'console.log(null)',
  'no args':       'console.log()',
  'false':         'console.log(false)',
  'empty array':   'console.log([])',
  'empty object':  'console.log({})',
  'object':        'console.log({hello: {world: true, key: undefined}})',
  'number':        'console.log(3)',
  'string':        'console.log(\'word\')',
  'empty string':  'console.log(\'\')',
  'regex':         'console.log(/asda/gm)',
  'function':      'console.log(function test() {})'
}))

test('can log standard datatypes printf style', matchesNodeOutput({
  '_init':         'var date = ' + date,
  'date':          'console.log(\'test %s\', new Date(date))',
  'undefined':     'console.log(\'test %s\', undefined)',
  'null':          'console.log(\'test %s\', null)',
  'no args':       'console.log(\'test %s\')',
  'false':         'console.log(\'test %s\', false)',
  'empty array':   'console.log(\'test %s\', [])',
  'empty object':  'console.log(\'test %s\', {})',
  'object':        'console.log(\'test %s\', {hello: {world: true, key: undefined}})',
  'number':        'console.log(\'test %s\', 3)',
  'string':        'console.log(\'test %s\', \'word\')',
  'empty string':  'console.log(\'test %s\', \'\')',
  'regex':         'console.log(\'test %s\', /asda/gm)',
  'function':      'console.log(\'test %s\', function test() {})'
}))

function matchesNodeOutput(commands) {
  return function(t) {
    var keys = Object.keys(commands)
    var vals = keys.map(function(d) {
      return commands[d]
    }).join(';')

    exec(process.execPath + ' -e "' + vals + '"', function(err, orig) {
      if (err) return t.fail(err.message)

      var browser = ss({ browser: process.env.browser, saucelabs: !!process.env.sauce })

      browser.pipe(bl(function(err, data) {
        if (err) return t.fail(err.message)

        var actual = String(data).split('\n')
        var expected = String(orig).split('\n')
        var names = keys.filter(function(key) {
          return key.charAt(0) !== '_'
        })

        t.equal(actual.length, expected.length, 'same amount of output')

        for (var i = 0; i < actual.length; i++) {
          // Ignore dates when testing saucelabs, because timezones
          var name = names[i]
          if (name === 'date' && !!process.env.sauce)
            continue

          t.deepEqual(actual[i], expected[i], names[i])
        }

        t.end()
      }))

      browser.write(vals + ';\n')
      browser.write('window.close()')
      browser.end()
    })
  }
}
