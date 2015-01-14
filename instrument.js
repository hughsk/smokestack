var xhr       = require('xhr')
var shoe      = require('shoe')('/smokestack')
var slice     = require('sliced')
var isDom     = require('is-dom')
var format    = require('util').format
var styles    = require('ansistyles')
var console   = window.console
var stripAnsi = require('strip-ansi')
var SourceMap = require('source-map').SourceMapConsumer

require('source-map-support').install()

var convert = require('convert-source-map');

var browserKind = process.env.browser

// keep around so can call
// console methods without sending data to server
var nativeConsole = {}

;['error'
, 'info'
, 'log'
, 'debug'
, 'warn'
].forEach(function(k) {
  var nativeMethod = console[k]
  nativeConsole[k] = nativeMethod.bind(console)
  var prefix = k

  console[k] = function() {
    // keep original args so browser can log as usual
    var args = slice(arguments)
    write(prefix, args)
    return nativeMethod.apply(this, args)
  }
})

function write(prefix, args) {
  // prepare args for transport
  var cleanArgs = args.map(function(item) {
    // no sensible default for stringifying
    // DOM Elements nicely so just toString and let
    // whoever is logging handle stringification.
    if (item && isDom(item)) return item.toString()
    return item
  })

  var output = format.apply(null, cleanArgs)
  var data = JSON.stringify([prefix].concat(output))

  shoe.write(data)
  shoe.write('\n')
}

var close = window.close

window.close = function() {
  setTimeout(function() {
    shoe.write(JSON.stringify({ end: true }))
    shoe.write('\n')
    shoe.once('data', function(data) {
      shoe.end()
    })
  })
}

shoe.on('end', function() {
  close()
})

xhr('script.js', function(err, resp) {
  if (err) return console.error(err)
  var src = resp.body
  var sourceMap = convert.fromSource(src)
  // Not all browsers support the full function signature
  // of window.onerror, so the Error instance is not always
  // guaranteed:
  // http://danlimerick.wordpress.com/2014/01/18/how-to-catch-javascript-errors-with-window-onerror-even-on-chrome-and-firefox/
  window.onerror = function(message, filename, line, col, error) {
    if (!error) {
      var error = new Error(message)
      error.stack = 'Error\n    at '+filename+':'+line+':'+col
    }
    error.fileName = error.fileName || filename
    error.lineNumber = error.lineNumber || line
    error.columnNumber = error.columnNumber || col
    if (sourceMap) {
      var sm = sourceMap.toObject()
      var smc = new SourceMap(sm)
      var original = smc.originalPositionFor({line: error.lineNumber, column: error.columnNumber})
      var source = smc.sourceContentFor(original.source)
      logError(source, error, original)
    } else {
      logError(src, error)
    }
    window.close()
  }

  var script = document.createElement("script")
  script.type = "text\/javascript"
  document.body.appendChild(script)
  script.src = 'script.js'

})

function logError(src, error, position) {
  var lines = src.trim().split('\n')
  position = position || {
    line: error.lineNumber,
    column: error.columnNumber,
    source: error.filename
  }
  var errorLine = '' + lines[position.line - 1]
  var spaces = ''
  write('error', [position.source + ':' +position.line])
  for (var i = 0; i < position.column; i++) {
    spaces += ' '
  }
  var columnLine = spaces + '^'
  var errorLines = [errorLine, columnLine]
  // write different data to remote console
  // and window console.
  write('error', [errorLines.join('\n') + '\n'])
  write('error', [error.stack])
  nativeConsole.error(error)
}
