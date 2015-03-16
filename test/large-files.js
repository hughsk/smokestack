var test = require('tape')
var bl = require('bl')
var ss = require('../')

test('can handle large files', function(t) {
  var browser = ss({
    browser: process.env.browser,
    saucelabs: !!process.env.sauce,
    debug: true
  })

  browser.pipe(bl(function(err, data) {
    if (err) return t.end(err)
    t.ok(data, 'data exists')
    data = String(data).trim()
    t.equal(data, 'hello world')
    t.end()
  }))


  // saucelabs seems to have problems when files
  // larger than 2MB
  var size = process.env.sauce ? 2 : 32
  var buffer = []
  for (var i = 0; i < size; i++)
  for (var j = 0; j < 1024; j++) {
    var data = []

    for (var k = 0; k < 512; k++) {
      data[k] = 1
    }

    buffer.push(data.join('+'))
  }

  buffer = buffer.join('')

  browser.write(buffer)
  browser.write(';console.log("hello world");')
  browser.write(';window.close();')
  browser.end()
})
