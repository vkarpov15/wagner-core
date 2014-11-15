var assert = require('assert');

var wagner = require('../');

describe('core', function() {
  it('works', function(done) {
    wagner.task('tristan', function(callback) {
      setTimeout(function() {
        callback(null, 'tristan');
      }, 50);
    });

    wagner.invoke(function(error, tristan) {
      assert.ok(!error);
      assert.equal(tristan, 'tristan');
      done();
    }, {});
  });
});