# smokestack

#### JavaScript goes in, console logs come out.

![](http://img.shields.io/badge/stability-experimental-orange.svg?style=flat)
![](http://img.shields.io/npm/v/smokestack.svg?style=flat)
![](http://img.shields.io/npm/dm/smokestack.svg?style=flat)
![](http://img.shields.io/npm/l/smokestack.svg?style=flat)

[![NPM](https://nodei.co/npm/smokestack.png?downloads=true)](https://nodei.co/npm/smokestack/)

Pipe your JavaScript into a browser of your choosing:

* Local Google Chrome.
* Local Mozilla Firefox.
* [Sauce Labs](http://saucelabs.com) for the rest.

A simple alternative to bigger browser automation tools, aiming to keep the
interface and initial setup as simple as possible: JavaScript goes in,
console logs come out. There's also support for browser screenshots in Chrome,
with the other browsers getting support for that soon too.

Designed for running UI tests on your desktop machine. You can use this,
for example, to run [tape](https://github.com/substack/tape) in the browser and
get TAP output in your terminal.

## CLI Usage

Most of the time, you'll want to use `smokestack` using the command-line
interface, which accepts JavaScript on stdin. For example, to run any arbitrary
JavaScript file:

``` bash
smokestack < script.js
```

You can include `smokestack` in the middle of your pipeline too. Here's an
example of using [browserify](http://browserify.org/) and
[tape](http://github.com/substack/tape) to run a test on Firefox, using
[tap-spec](https://github.com/scottcorgan/tap-spec) for formatting:

``` bash
browserify test.js | smokestack -b firefox | tap-spec
```

This works because any calls to `console.log` and its variants are sent back
from the browser out to the other side of the `smokestack` process.

```
Usage:
  smokestack {OPTIONS} < script.js

General:
  -b, --browser  Specify which browser to use [default: chrome]
  -t, --timeout  Specify the maximum timeout in milliseconds
  -p, --port     Specify a port for smokestack to listen to
  -h, --help     Display this message

Sauce Labs only:
  -s, --saucelabs  Include to run your tests on Sauce Labs
  -u, --username   Username to log in with
  -k, --key        API Access key to use
```

## Browser Usage

### `console.log`

`console.log` and its variants are all instrumented such that they not only
log output to your console, but to the other side of the smokestack process
in your Terminal too! You can use these methods the way you're familiar
with them in node or your favourite browser, they'll work just the same.

### `window.close`

`window.close` is instrumented by smokestack to trigger the end of a run.
In most cases, you don't want to manually close the browser and have that
happen automatically when it's ready.

Just use this method when you've done what you wanted to do, and it'll tell
Chrome/Firefox/Sauce Labs to shut down (relatively) gracefully.

### `smokestack = require('smokestack')`

For any optional extras which don't have a native browser analogue, you can
pull in `smokestack` using [browserify](http://browserify.org/).

### `smokestack.capture(dest, done)`

Takes a screenshot of the current browser window, writing out the captured file
to `dest`. Currently only works on Chrome, but eventually this will be available
on Firefox and Sauce Labs too.

Images will be saved as PNGs.

``` javascript
var smokestack = require('smokestack')

window.onload = function() {
  smokestack.capture('screenshots/0001.png', function(err) {
    if (err) throw err
    window.close()
  })
}
```

## Module Usage

### `stream = smokestack(opts)`

Creates a new smokestack `stream`. You should pipe JavaScript into it, and
pipe the console output somewhere else, much the same as you would when using
the command-line:

``` javascript
var smokestack = require('smokestack')
var fs         = require('fs')

fs.createReadStream('script.js')
  .pipe(smokestack({
      browser: 'chrome'
    , timeout: 15000
    , saucelabs: false
  }))
  .pipe(process.stdout)
```

`opts` are equivalent to what's used in the command-line interface.

## Sauce Labs

Using Sauce Labs with smokestack is simple, simply include the following
additional arguments:

``` bash
smokestack --saucelabs --username USERNAME --key ACCESS_KEY
```

Your username/key will also get picked up from your environment if they're
defined too, so feel free to include the following in your `~/.bash_profile`
and omit the `--username` and `--key` flags:

``` bash
# Obviously, include your own, non-fake credentials here:
export SAUCE_USERNAME='hughskennedy'
export SAUCE_ACCESS_KEY='138b247bc5b6-b14b-a4d4-agcf-82c460a2'
```

## Headless Browsers

You may be able to run a browser headlessly using an [X virtual frame buffer](https://en.wikipedia.org/wiki/Xvfb).

For example, on recent Debian linux:

``` bash
# Install Xvfb from Debian Repository
sudo apt-get update
sudo apt-get install -y xvfb

# Install Google Chrome to google-chrome
wget -c wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo ln -s $(which google-chrome-stable) /usr/bin/google-chrome

# Start a virtual framebuffer display
Xvfb :1 -screen 5 1024x768x8 &
export DISPLAY=:1.5

# Run tests in Chrome
npm run test:chrome
```

## See Also
- [tap-closer](https://github.com/hughsk/tap-closer) -- close the browser
window once TAP tests have finished

## License

MIT. See [LICENSE.md](http://github.com/hughsk/smokestack/blob/master/LICENSE.md) for details.
