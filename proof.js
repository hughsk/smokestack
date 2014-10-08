var ss = require('./')

var browser = ss()

browser.write('console.log("hi there!")\n')
browser.write('console.error("stderr too")\n')
browser.write('alert("this thing\'s blocking your way")\n')
browser.write('window.close()')
browser.end()
browser.on('close', function() {
  process.exit()
})
