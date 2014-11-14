var pngparse   = require('pngparse-sync')
var browserify = require('browserify')
var crypto     = require('crypto')
var test       = require('tape')
var path       = require('path')
var smokestack = require('../')
var fs         = require('fs')

test('desktop capture', function(t) {
  var bundler = browserify(path.join(__dirname, 'capture-browser.js')).bundle()
  var browser = smokestack()

  bundler.pipe(browser).once('end', function() {
    var imgRed  = path.join(__dirname, 'screenshots', 'capture-red.png')
    var imgBlue = path.join(__dirname, 'screenshots', 'capture-blue.png')

    t.notEqual(
        hash(red = fs.readFileSync(imgRed))
      , hash(blue = fs.readFileSync(imgBlue))
      , 'images should not hash to same value'
    )

    red = pngparse(red)
    blue   = pngparse(blue)

    t.equal(blue.data[0], 34, "Blue image's red component")
    t.equal(blue.data[1], 51, "Blue image's green component")
    t.equal(blue.data[2], 255, "Blue image's blue component")
    t.equal(blue.channels, 3, "Blue image is RGB, not RGBA")

    t.equal(red.data[0], 255, "Red image's red component")
    t.equal(red.data[1], 34, "Red image's green component")
    t.equal(red.data[2], 51, "Red image's blue component")
    t.equal(red.channels, 3, "Red image is RGB, not RGBA")

    fs.unlinkSync(imgRed)
    fs.unlinkSync(imgBlue)
    t.end()
  })
})

function hash(buffer) {
  return crypto.createHash('md5')
    .update(buffer)
    .digest('base64')
}
