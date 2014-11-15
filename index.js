var quicktmp = require('quick-tmp')('smokestack')
var debug    = require('debug')('smokestack')
var spawn    = require('child_process').spawn
var firefox  = require('firefox-location')
var chrome   = require('chrome-location')
var through  = require('through2')
var rimraf   = require('rimraf')
var mkdirp   = require('mkdirp')
var split    = require('split')
var shoe     = require('shoe')
var http     = require('http')
var path     = require('path')
var util     = require('util')
var url      = require('url')
var fs       = require('fs')
var bl       = require('bl')

var bundle = fs.readFileSync(
  path.join(__dirname, 'bundle.js')
)

var index = fs.readFileSync(
  path.join(__dirname, 'index.html')
)

module.exports = smokestack

function smokestack(opts) {
  opts = opts || {}

  var browser = opts.browser || 'chrome'
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
    if (uri === '/_upload') return upload(req, res)

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
      .once('close', stream.shutdown)
      .pipe(browser)
  }).install(server, '/smokestack')

  function handleInput(data, _, next) {
    data = JSON.parse(data)

    if (data.end) {
      return this.push('end\n')
    }

    var key = data.shift()
    stream.push(data + '\n')
    next()
  }

  stream.shutdown = function shutdown(fn) {
    // ensure shutdown only called once
    if (shutdown.called) return fn && fn()
    process.removeListener('exit', stream.shutdown)
    process.removeListener('close', stream.shutdown)
    launched && launched.removeListener('exit', stream.shutdown)

    shutdown.called = true
    // kill child if necessary
    if (launched && !launched.killed) {
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

    switch (browser) {
      case 'chrome':
        launched = spawn(chrome, [
            '--app='+uri
          , '--no-first-run'
          , '--disable-translate'
          , '--no-default-browser-check'
          , '--disable-default-apps'
          , '--disable-popup-blocking'
          , '--disable-zero-browsers-open-for-tests'
          , '--user-data-dir=' + tmp
          , '--load-extension=' + __dirname + '/lib/extension-chrome'
        ])
      break
      case 'firefox':
        mkdirp.sync(tmp)
        fs.writeFileSync(path.join(tmp, 'user.js'), [
            'user_pref("browser.shell.checkDefaultBrowser", false);'
          , 'user_pref("browser.bookmarks.restore_default_bookmarks", false);'
          , 'user_pref("dom.allow_scripts_to_close_windows", true);'
          , 'user_pref("dom.disable_open_during_load", false);'
          , 'user_pref("dom.max_script_run_time", 0);'
        ].join('\n'))

        launched = spawn(firefox, [
            uri
          , '-new-instance'
          , '-no-remote'
          , '-profile', tmp
          , '-purgecaches'
        ])
      break
      default:
        return stream.emit('error', new Error('Unknown browser: ' + browser))
      break
    }

    launched.once('exit', stream.shutdown)
    stream.emit('spawn', launched)
    process.once('exit', stream.shutdown)
    process.once('close', stream.shutdown)
  }

  function send(res, data, type) {
    res.setHeader('content-type', type)
    res.end(data)
  }

  function upload(req, res) {
    req.pipe(bl(function(err, data) {
      if (err) return bail(err, req, res)

      data = JSON.parse(data)

      var dst = path.resolve(data.dst)
      var uri = data.uri.replace(/^.+base64,/g, '')
      var img = new Buffer(uri, 'base64')

      mkdirp(path.dirname(dst), function(err) {
        if (err) return bail(err, req, res)

        fs.writeFile(dst, img, function(err) {
          if (err) return bail(err, req, res)
          res.end()
        })
      })
    }))
  }

  function bail(err, req, res) {
    res.statusCode = 500
    res.end([err.message, err.stack].join('\n'))
  }
}
