var quicktmp = require('quick-tmp')('smokestack')
var debug    = require('debug')('smokestack')
var spawn    = require('child_process').spawn
var chrome   = require('chrome-location')
var through  = require('through2')
var rimraf   = require('rimraf')
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
  var tmp = undefined
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
    stream.emit('listen', server)
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
      .once('close', function() {
        stream.shutdown()
      })
      .pipe(browser)
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

  stream.shutdown = function shutdown(fn) {
    // ensure shutdown only called once
    if (shutdown.called) return fn && fn()

    shutdown.called = true
    // kill child if necessary
    if (!launched.killed) {
      launched.once('close', next)
      launched.kill()
    } else {
      next()
    }
    function next() {
      // remove tmpdir if necessary
      tmp ? rimraf(tmp, next) : next()
      function next() {
        // tmpdir if necessary
        server._handle ? server.close(next) : next()
        function next() {
          tmp = null
          stream.emit('end')
          stream.emit('close')
          process.nextTick(function() {
            stream.emit('finish')
            stream.emit('shutdown')
            fn && fn()
          })
        }
      }
    }
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
    tmp = quicktmp()

    launched = spawn(chrome, [
        '--app=' + uri
      , '--disable-extensions'
      , '--no-first-run'
      , '--disable-translate'
      , '--no-default-browser-check'
      , '--disable-default-apps'
      , '--disable-popup-blocking'
      , '--disable-extensions'
      , '--disable-zero-browsers-open-for-tests'
      , '--user-data-dir=' + tmp
    ]).once('exit', function() {
      stream.shutdown()
    })
    stream.emit('spawn', launched)
    process.once('exit', function() {
      stream.shutdown()
    })
    process.once('close', function() {
      stream.shutdown()
    })
  }

  function send(res, data, type) {
    res.setHeader('content-type', type)
    res.end(data)
  }
}
