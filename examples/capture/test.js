var smokestack = require('../../')

var iframe = document.createElement('iframe')

iframe.src = 'http://nodesource.com'
iframe.onload = function() {
  console.log('page loaded')
  smokestack.capture('screenshot.png', function(err) {
    if (err) throw err

    console.log('captured screenshot, closing')
    window.close()
  })
}

iframe.width = window.innerWidth + 'px'
iframe.height = window.innerHeight + 'px'
iframe.style.position = 'absolute'
iframe.style.top = 0
iframe.style.left = 0
document.body.appendChild(iframe)
