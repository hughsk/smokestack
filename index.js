var quicktmp = require('quick-tmp')('smokestack')
var debug    = require('debug')('smokestack')
var spawn    = require('child_process').spawn
var firefox  = require('firefox-location')
var chrome   = require('chrome-location')
var tunnel   = require('localtunnel')
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
var wd       = require('wd')

var createServer = require('./lib/server')

module.exports = smokestack

function smokestack(opts) {
  opts = opts || {}

  var browser   = opts.browser || 'chrome'
  var saucelabs = !!opts.saucelabs
  var sauceUser = opts.sauceUsername || process.env.SAUCE_USERNAME
  var sauceKey  = opts.sauceKey || process.env.SAUCE_ACCESS_KEY

  var tunneller = null
  var launched = null
  var sauce = null
  var tmp = null

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

    data = JSON.parse(data)

    if (data.end) {
      this.push('end\n')

      return setTimeout(function() {
        if (self.writable) self.push(null)
      }, 1000)
    }

    var key = data.shift()
    stream.push(data + '\n')
    next()
  }

  stream.shutdown = function shutdown(fn) {
    // ensure shutdown only called once
    if (shutdown.called) return fn && fn(); shutdown.called = true
    if (launched) launched.removeListener('exit', stream.shutdown)
    process.removeListener('exit', stream.shutdown)
    process.removeListener('close', stream.shutdown)

    debug('Shutting down!')

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
      // remove tmpdir if necessary
      debug('Removing temporary directory')
      tmp ? rimraf(tmp, next) : next()

      function next() {
        // closing server if necessary
        debug('Shutting down host server')
        server._handle ? server.close(next) : next()

        function next() {
          tmp = null
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
  }

  return stream

  function write(data, _, next) {
    buffer.push(data)
    next()
  }

  function flush() {
    buffer = buffer.join('')
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
      })
    })
  }

  function launchBrowser() {
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
}
