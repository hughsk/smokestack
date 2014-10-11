var quicktmp = require('quick-tmp')('smokestack')
var debug    = require('debug')('smokestack')
var spawn    = require('child_process').spawn
var chrome   = require('chrome-location')
var through  = require('through2')
var split    = require('split')
var shoe     = require('shoe')
var http     = require('http')
var path     = require('path')
var util     = require('util')
var url      = require('url')
var fs       = require('fs')

var bundle = fs.readFileSync(
  path.join(__dirname, 'bundle.js')
)

var index = fs.readFileSync(
  path.join(__dirname, 'index.html')
)

module.exports = smokestack

function smokestack(opts) {
  opts = opts || {}

  var launched = null
  var listen = false
  var script = false

  var stream = through(write, flush)
  var server = http.createServer()
  var port   = opts.port || 0
  var buffer = []

  server.on('request', function(req, res) {
    var uri = url.parse(req.url).pathname
    if (uri === '/') return send(res, index, 'text/html')
    if (uri === '/script.js') return send(res, buffer, 'text/javascript')
    if (uri === '/favicon.ico') return res.end()
    res.statusCode = 302
    res.setHeader('Location', '/')
    res.end()
  })

  server.listen(port, function(err) {
    port = server.address().port
    if (err) return stream.emit('error', err)
    debug('http://localhost:'+port+'/')
    listen = true
    if (script) return open()
  })

  shoe(function(browser) {
    stream.emit('connect', browser)
    var handle = through(handleInput)

    browser
      .pipe(split())
      .pipe(handle)
      .pipe(browser)
      .once('close', function() {
        launched.kill()
      })
  }).install(server, '/smokestack')

  function handleInput(data, _, next) {
    data = JSON.parse(data)

    if (data.end) {
      return this.push('end\n')
    }

    var key = data.shift()
    var format = data.shift() // e.g. printf style
    stream.push(util.format.apply(util, [format].concat(data))+ '\n')
    next()
  }

  return stream

  function write(data, _, next) {
    buffer.push(data)
    next()
  }

  function flush() {
    buffer = buffer.join('')
    buffer = [bundle, buffer].join(';\n')
    script = true
    if (listen) return open()
  }

  function open() {
    var uri = 'http://localhost:'+port+'/'
    var tmp = quicktmp()

    launched = spawn(chrome, [
        '--app=' + uri
      , '--disable-extensions'
      , '--no-first-run'
      , '--disable-translate'
      , '--no-default-browser-check'
      , '--disable-default-apps'
      , '--disable-popup-blocking'
      , '--disable-extensions'
      , '--user-data-dir=' + tmp
    ]).once('close', function() {
      server.close()
      stream.emit('end')
      process.nextTick(function() {
        stream.emit('close')
        stream.emit('finish')
      })
    })
    stream.emit('spawn', launched)
    process.on('exit', function() {
      launched.kill()
    })
  }

  function send(res, data, type) {
    res.setHeader('content-type', type)
    res.end(data)
  }
}
