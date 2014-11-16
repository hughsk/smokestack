var smokestack = require('../')

var file1 = 'test/screenshots/capture-red.png'
var file2 = 'test/screenshots/capture-blue.png'

document.body.style.background = '#f23'
smokestack.capture(file1, function(err, uri) {
  if (err) throw err

  document.body.style.background = '#23f'
  smokestack.capture(file2, function(err, uri) {
    if (err) throw err

    setTimeout(function() { window.close() })
  })
})
