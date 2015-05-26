var assert = require('assert');
var wagner = require('../lib');

describe('Safe', function() {
  it('emits NodeJS callback errors', function(done) {
    var safe = wagner.safe();

    safe.on('error', function(error) {
      assert.equal(error, 'Error!');
      done();
    });

    var f = safe.try(function() {
      assert.ok(false);
    });

    f('Error!');
  });

  it('emits exceptions', function(done) {
    var safe = wagner.safe();

    safe.on('error', function(error) {
      assert.equal(error.toString(), 'ReferenceError: a is not defined');
      done();
    });

    var f = safe.try(function() {
      a.b = 5;
    });

    f();
  });
});
