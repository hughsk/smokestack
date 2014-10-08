# smokestack [![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

Pipe your JavaScript into a browser, logging console output in Node.

Designed for running UI tests on your desktop machine. You can use this,
for example, to run [tape](https://github.com/substack/tape) in the browser and
get TAP output in your terminal.

Specifically, it does it like so:

* Get the JavaScript input through a stream.
* Instrument the script to pass `console` calls back home.
* Host a temporary server with that script.
* Run a standalone/untainted instance of Chrome and point it to the server.
* When `window.close` is called, exit the Chrome process and end the stream.

**WORK IN PROGRESS. TODO:**

* CLI interface
* Support:
  * Firefox
  * Phantom
* Instead of calling console commands directly, spit it out on the other side
  of the stream so it can be piped elsewhere. Will require emulation for `time`,
  `timeEnd`, etc.
* Separate `stdout` and `stderr` streams?
* Support for `console` methods not available in node.

## Module Usage

[![NPM](https://nodei.co/npm/smokestack.png)](https://nodei.co/npm/smokestack/)

### `stream = smokestack(opts)`

Current options:

* `port`: the port to run your temporary server on.

## License

MIT. See [LICENSE.md](http://github.com/hughsk/smokestack/blob/master/LICENSE.md) for details.
