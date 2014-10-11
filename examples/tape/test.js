var test = require('tape')

test('this should pass', function(t) {
  t.ok(true, 'an assertion')
  t.end()
})

test('this should fail', function(t) {
  t.ok(false, 'an assertion')
  t.end()
})
