var debug    = require('debug')('smokestack')
var spawn    = require('child_process').spawn
var firefox  = require('firefox-launch')
var chrome   = require('chrome-launch')
var tunnel   = require('localtunnel')
var through  = require('through2')
var split    = require('split')
var shoe     = require('shoe')
var url      = require('url')
var wd       = require('wd')

var createServer = require('./lib/server')

module.exports = smokestack

function smokestack(opts) {
  opts = opts || {}

  var browser   = opts.browser || 'chrome'
  var saucelabs = !!opts.saucelabs || process.env.SAUCE
  var sauceUser = opts.sauceUsername || process.env.SAUCE_USERNAME
  var sauceKey  = opts.sauceKey || process.env.SAUCE_ACCESS_KEY

  var tunneller = null
  var launched = null
  var sauce = null
  var interval = null

  var listen = false
  var script = false

  var stream = through(write, flush)
  var server = createServer()
  var port   = opts.port || 0
  var buffer = []

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
    var self = this
    data = JSON.parse(String(data))

    if (data.end) {
      this.push('end\n')

      return setTimeout(function() {
        if (self.writable) self.push(null)
      }, 1000)
    }

    data.shift() // remove prefix/key e.g. log/error/warn
    stream.push(data + '\n')
    next()
  }

  stream.shutdown = function shutdown(fn) {
    if (typeof fn !== 'function') fn = false

    // ensure shutdown only called once
    if (shutdown.called) return fn && fn(); shutdown.called = true
    if (launched) launched.removeListener('exit', stream.shutdown)
    process.removeListener('exit', stream.shutdown)
    process.removeListener('close', stream.shutdown)

    debug('Shutting down!')

    // stop the "ping" interval
    if (interval) {
      clearInterval(interval)
    }

    // kill child if necessary
    if (launched && !launched.killed) {
      debug('Killing child process')
      launched.once('close', next)
      launched.kill()
    } else {
      if (tunneller) tunneller.close()
      if (sauce) {
        debug('Disconnecting browser session, closing tunnel')
        sauce.quit(next)
      } else {
        next()
      }
    }

    function next() {
      // closing server if necessary
      debug('Shutting down host server')
      server._handle ? server.close(next) : next()

      function next() {
        stream.emit('end')
        stream.emit('close')
        process.nextTick(function() {
          stream.emit('finish')
          stream.emit('shutdown')
          debug('Shutdown complete')
          fn && fn()
        })
      }
    }
  }

  return stream

  function write(data, _, next) {
    buffer.push(data)
    next()
  }

  function flush() {
    server.updateBuffer(buffer)
    script = true
    if (listen) return open()
  }

  function open() {
    return saucelabs
      ? launchRemote()
      : launchBrowser()
  }

  function launchRemote() {
    debug('Launching remote test, using http://localtunnel.me')

    tunnel(port, {
      host: 'http://localtunnel.me/'
    }, function(err, _tunneller) {
      if (err) return stream.emit('error', err)
      debug('localtunnel URL: %s', (tunneller = _tunneller).url)

      var hostname = 'ondemand.saucelabs.com'
      var hostport = 80
      var user     = sauceUser
      var key      = sauceKey
      var config   = {
          browserName: browser
        , platform: 'MAC'
        , javascriptEnabled: true
        , takeScreenshot: true
      }

      if (!user) return stream.emit('error', new Error('No username provided for saucelabs'))
      if (!key) return stream.emit('error', new Error('No access key provided for saucelabs'))

      debug('Connecting to %s', hostname)
      debug('Username: %s', user)
      debug('API Key: %s', key)
      debug('Config: %o', config)

      sauce = wd.remote(hostname, hostport, user, key)
      sauce.init(config, function(err) {
        if (err) return stream.emit('error', err)

        debug('Connection established')
        debug('Hitting %s', tunneller.url)

        sauce.get(tunneller.url, function(err) {
          if (err) return stream.emit('error', err)

          debug('Hit %s successfully', tunneller.url)
        })
        // ping saucelabs every 10 seconds so the connection
        // doesn't go down
        interval = setInterval(function () {
          sauce.eval('1 + 1')
        }, 10000)
      })
    })
  }

  function launchBrowser() {
    var uri = 'http://localhost:'+port+'/'

    switch (browser) {
      case 'chrome':
        launched = chrome(uri, {
          args: ['--load-extension=' + __dirname + '/lib/extension-chrome']
        })
      break
      case 'firefox':
        launched = firefox(uri)
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
}
