chrome.runtime.onMessage.addListener(function(req, sender, done) {
  if (req.trigger !== 'screenshot') return console.log('ignoring', req.trigger)

  chrome.tabs.captureVisibleTab(null, {
    format: 'png'
  }, function(uri) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      var tab = tabs.shift()
      if (!tab) return

      chrome.tabs.sendMessage(tab.id, { uri: uri })
    })
  })
})
