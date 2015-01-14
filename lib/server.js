var debug  = require('debug')('smokestack')
var mkdirp = require('mkdirp')
var http   = require('http')
var path   = require('path')
var url    = require('url')
var fs     = require('fs')
var bl     = require('bl')

module.exports = createServer

var bundle = fs.readFileSync(
  path.resolve(__dirname, '..', 'bundle.js')
)

var index = fs.readFileSync(
  path.resolve(__dirname, '..', 'index.html')
)

function createServer(basedir) {
  basedir = basedir || process.cwd()

  var server = http.createServer()
  var buffer = bundle

  server.on('request', handle)
  server.updateBuffer = updateBuffer
  server.contentBuffer =  new Buffer(0)

  return server

  function handle(req, res) {
    debug('Handling request: %s', req.url)

    var uri = url.parse(req.url).pathname
    if (uri === '/') return send(res, index, 'text/html')
    if (uri === '/init.js') return send(res, buffer, 'text/javascript')
    if (uri === '/script.js') return send(res, server.contentBuffer, 'text/javascript')
    if (uri === '/favicon.ico') return res.end()
    if (uri === '/_upload') return upload(req, res)

    res.statusCode = 302
    res.setHeader('Location', '/')
    res.end()
  }

  function send(res, data, type) {
    res.setHeader('content-type', type)
    res.end(data)
  }

  function updateBuffer(newBuffers) {
    server.contentBuffer = contentBuffer = Buffer.concat([server.contentBuffer].concat(newBuffers))
  }

  function upload(req, res) {
    req.pipe(bl(function(err, data) {
      if (err) return bail(err, req, res)

      data = JSON.parse(data)

      var dst = path.resolve(basedir, data.dst)
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
