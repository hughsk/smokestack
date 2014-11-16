var spawn = require('child_process').spawn
var test  = require('tape')
var path  = require('path')
var fs    = require('fs')
var bl    = require('bl')

var bin = require.resolve('../bin/smokestack')

test('closes cleanly in the simplest case', function(t) {
  var browser = spawn(bin, [
    '-b', process.env.browser
  ].concat(
    process.env.sauce
      ? ['--saucelabs']
      : []
  ))

  t.plan(2)

  fs.createReadStream(path.join(__dirname, 'clean-close-browser.js'))
    .pipe(browser.stdin)

  browser.stdout.pipe(bl(function(err, data) {
    if (err) return t.fail(err.message)
    t.equal(String(data), 'hello world\n', 'output the correct data')
  }))

  browser.once('exit', function() {
    t.pass('closed cleanly')
  })
})
