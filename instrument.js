var shoe      = require('shoe')('/smokestack')
var stringify = require('json-stringify-safe')
var slice     = require('sliced')
var console   = window.console

;['error'
, 'info'
, 'log'
, 'debug'
, 'warn'
].forEach(function(k) {
  var old = console[k]
  var prefix = [k]

  console[k] = function() {
    var args = slice(arguments)
    var data = stringify(prefix.concat(args))

    shoe.write(data)
    shoe.write('\n')

    return old.apply(this, args)
  }
})

var close = window.close

window.close = function() {
  shoe.write(JSON.stringify({ end: true }))
  shoe.write('\n')
  shoe.once('data', function(data) {
    close()
  })
}
