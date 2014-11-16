
document.body.addEventListener('smokestack:capture', function() {
  setTimeout(function() {
    chrome.runtime.sendMessage({
      trigger: 'screenshot'
    })
  }, 1000)
}, false)

chrome.runtime.onMessage.addListener(function(message) {
  var event = document.createEvent('Event')
  var uri   = message.uri

  var el = (
       document.getElementById('smokestack-screencap')
    || document.createElement('div')
  )

  el.id = 'smokestack-screencap'
  el.innerHTML = uri
  el.style.display = 'none'
  document.head.appendChild(el)

  event.initEvent('smokestack:captured', false, false)
  document.body.dispatchEvent(event)
})
