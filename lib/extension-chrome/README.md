# smokestack Chrome Extension

Loaded into each (otherwise "clean") Chrome instance when spawning smokestack.

Its primary purpose is for capturing screenshots, which can *only* be
done using an extension. It's exposed using `smokestack.capture` in the browser:

``` javascript
var smokestack = require('smokestack')

smokestack.capture('screenshots/current.png', function(err, uri) {
  if (err) throw uri
  window.close()
})
```

Here's how it works:

1. `../../browser.js` is loaded in via `require('smokestack')`. When called, it
    fires an event on `document.body` that sparks off the following chain of
    events.
1. `content.js` waits for this event, which it will then pass on to the
    background script.
1. `background.js` is responsible for taking the actual screenshot. We couldn't
    do this any sooner because of various Chrome's extension security gotchas.
    The screenshot is retrieved as a base64 data URI, which is passed on
    back to `content.js`
1.  `content.js` then sticks the URL in a `<div>` in `document.head`, because
    that's the only apparent way to share state between a content script
    and the browser. It then fires its own event for the main browser thread
    to respond to.
1.  `../../browser.js` picks up this event again, and uploads the screenshot
    data URI to the smokestack server, along with the file path you'd like
    to save your screenshot to.
1.  The smokestack server then extracts the image content from the URL,
    saving the resulting Buffer to the path supplied.
1.  The XMLHttpRequest is closed, signalling to the browser that everything
    worked as planned, and finally the `done` callback is fired.

Some of the above may be Wrong or Bad, so if you have any ideas for simplifying
the process then please send through a pull request!
