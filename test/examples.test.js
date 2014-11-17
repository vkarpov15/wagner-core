var assert = require('assert');

var wagner = require('../');

/* `invokeAsync()` is the primary function you will use to execute
 * async code with Wagner */
describe('`wagner.invokeAsync()`', function() {
  it('allows you to execute async tasks based on parameter names', function(done) {
    wagner.task('eggs', function(callback) {
      setTimeout(function() {
        callback(null, 'done cooking!');
      }, 5);
    });

    wagner.invokeAsync(function(error, eggs) {
      assert.ok(!error);
      assert.equal(eggs, 'done cooking!');
      done();
    }, {});
  });
});