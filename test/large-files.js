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
    t.error(err, 'does not error')
    data = data.toString().trim()
    t.equal(data, 'hello world')
    t.end()
  }))

  // 32 megabytes
  var buffer = []

  for (var i = 0; i < 32; i++)
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
