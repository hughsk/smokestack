// For requiring smokestack-specific behavior in your test files.
// Namely, smokestack's screenshot feature.

var DOMEvent = require('synthetic-dom-events')
var xhr      = require('xhr')

var stack = document.body.smokestack = document.body.smokestack || {}

stack.capture = stack.capture || capture
function capture(dst, done) {
  done(new Error(
    'Screen captures are not supported in this browser'
  ))
}

exports.capture = function(dst, done) {
  setTimeout(function() {
    if (!window.chrome) {
      return done(new Error(
        'Screen captures are not supported in this browser'
      ))
    }

    document.body.dispatchEvent(DOMEvent('smokestack:capture'))
    document.body.addEventListener('smokestack:captured', captured, false)

    function captured(e) {
      var screencap = document.getElementById('smokestack-screencap')
      var datauri   = screencap.innerHTML

      screencap.parentNode.removeChild(screencap)
      document.body.removeEventListener('smokestack:captured', captured, false)

      xhr({
          uri: '/_upload'
        , json: { uri: datauri, dst: dst }
        , method: 'POST'
      }, function(err, res, body) {
        done(err, datauri)
      })
    }
  }, 50)
}
